import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, Edit, Trash2, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppTemplate {
  id: string;
  name: string;
  message: string;
  variables: string[];
  category: string;
}

const DEFAULT_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "1",
    name: "Orçamento Aprovado",
    message: "Olá {nome}! Seu orçamento #{numero} no valor de R$ {valor} foi aprovado! Quando podemos agendar a entrega? 📦✨",
    variables: ["nome", "numero", "valor"],
    category: "vendas"
  },
  {
    id: "2", 
    name: "Follow-up Cliente",
    message: "Oi {nome}! Como você está? Vi que você teve interesse nos nossos suplementos. Posso te ajudar com alguma dúvida? 💪",
    variables: ["nome"],
    category: "relacionamento"
  },
  {
    id: "3",
    name: "Produto em Estoque",
    message: "🎉 Boa notícia {nome}! O produto {produto} que você estava procurando acabou de chegar. Quer garantir o seu?",
    variables: ["nome", "produto"],
    category: "estoque"
  }
];

export const WhatsAppTemplates = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    message: "",
    category: "",
    variables: [] as string[]
  });
  const { toast } = useToast();

  const extractVariables = (message: string): string[] => {
    const matches = message.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  const handleSaveTemplate = () => {
    const variables = extractVariables(editForm.message);
    
    if (selectedTemplate) {
      // Edit existing
      setTemplates(prev => prev.map(t => 
        t.id === selectedTemplate.id 
          ? { ...t, ...editForm, variables }
          : t
      ));
      toast({
        title: "Template atualizado!",
        description: "As alterações foram salvas com sucesso."
      });
    } else {
      // Add new
      const newTemplate: WhatsAppTemplate = {
        id: Date.now().toString(),
        ...editForm,
        variables
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast({
        title: "Template criado!",
        description: "Novo template adicionado com sucesso."
      });
    }

    setIsEditing(false);
    setSelectedTemplate(null);
    setEditForm({ name: "", message: "", category: "", variables: [] });
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

  const handleDeleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast({
      title: "Template excluído",
      description: "Template removido com sucesso."
    });
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
              <Button onClick={handleSaveTemplate} className="flex-1">
                {selectedTemplate ? "Atualizar" : "Criar"} Template
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