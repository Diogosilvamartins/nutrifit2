import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Edit, Trash2, Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
  category: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export const WhatsAppTemplates = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    message: "",
    category: "",
    variables: [] as string[]
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      // Convert variables from JSONB to string array
      const formattedTemplates = (data || []).map(template => ({
        ...template,
        variables: Array.isArray(template.variables) 
          ? (template.variables as string[])
          : []
      })) as WhatsAppTemplate[];
      
      setTemplates(formattedTemplates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast({
        title: "Erro ao carregar templates",
        description: "Não foi possível carregar os templates.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (message: string): string[] => {
    const matches = message.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const handleSaveTemplate = async () => {
    if (!editForm.name.trim() || !editForm.message.trim() || !editForm.category.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, mensagem e categoria.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    const variables = extractVariables(editForm.message);
    
    try {
      if (selectedTemplate) {
        // Edit existing
        const { error } = await supabase
          .from('whatsapp_templates')
          .update({
            name: editForm.name,
            message: editForm.message,
            category: editForm.category,
            variables: variables
          })
          .eq('id', selectedTemplate.id);

        if (error) {
          console.error("Update error:", error);
          throw error;
        }

        // Update local state immediately
        setTemplates(prevTemplates => 
          prevTemplates.map(template => 
            template.id === selectedTemplate.id 
              ? { ...template, ...editForm, variables }
              : template
          )
        );

        toast({
          title: "Template atualizado!",
          description: "As alterações foram salvas com sucesso."
        });
      } else {
        // Add new
        const { error } = await supabase
          .from('whatsapp_templates')
          .insert([{
            name: editForm.name,
            message: editForm.message,
            category: editForm.category,
            variables: variables,
            created_by: (await supabase.auth.getUser()).data.user?.id
          }]);

        if (error) {
          console.error("Insert error:", error);
          throw error;
        }

        toast({
          title: "Template criado!",
          description: "Novo template adicionado com sucesso."
        });
      }

      // Refresh templates from server
      await fetchTemplates();
      setIsEditing(false);
      setSelectedTemplate(null);
      setEditForm({ name: "", message: "", category: "", variables: [] });
    } catch (error) {
      console.error("Error saving template:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o template. Verifique os dados e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditTemplate = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template);
    setEditForm({
      name: template.name,
      message: template.message,
      category: template.category,
      variables: template.variables
    });
    setIsEditing(true);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('whatsapp_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      await fetchTemplates();
      toast({
        title: "Template excluído",
        description: "Template removido com sucesso."
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o template.",
        variant: "destructive"
      });
    }
  };

  const handleCopyTemplate = (message: string) => {
    navigator.clipboard.writeText(message);
    toast({
      title: "Copiado!",
      description: "Mensagem copiada para a área de transferência."
    });
  };

  const generateWhatsAppMessage = (template: WhatsAppTemplate, values: Record<string, string>) => {
    let message = template.message;
    template.variables.forEach(variable => {
      message = message.replace(`{${variable}}`, values[variable] || `{${variable}}`);
    });
    return message;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Templates WhatsApp</h2>
          <p className="text-muted-foreground">Gerencie seus templates de mensagens</p>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Template
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando templates...</span>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="secondary">{template.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm leading-relaxed">{template.message}</p>
              </div>
              
              {template.variables.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-2">Variáveis:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleCopyTemplate(template.message)}
                  className="flex-1"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleDeleteTemplate(template.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      )}

      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome do Template</Label>
                <Input
                  id="name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({...prev, name: e.target.value}))}
                  placeholder="Ex: Follow-up Cliente"
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={editForm.category}
                  onChange={(e) => setEditForm(prev => ({...prev, category: e.target.value}))}
                  placeholder="Ex: vendas, relacionamento"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                value={editForm.message}
                onChange={(e) => setEditForm(prev => ({...prev, message: e.target.value}))}
                placeholder="Use {variavel} para campos dinâmicos. Ex: Olá {nome}!"
                rows={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use chaves para criar variáveis: {"{nome}"}, {"{valor}"}, etc.
              </p>
            </div>

            {extractVariables(editForm.message).length > 0 && (
              <div>
                <Label>Variáveis detectadas:</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {extractVariables(editForm.message).map((variable) => (
                    <Badge key={variable} variant="secondary">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveTemplate} 
                className="flex-1" 
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  selectedTemplate ? "Atualizar Template" : "Criar Template"
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEditing(false);
                  setSelectedTemplate(null);
                  setEditForm({ name: "", message: "", category: "", variables: [] });
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};