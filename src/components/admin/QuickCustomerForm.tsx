import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatPhone } from "@/lib/validators";
import { UserPlus } from "lucide-react";

interface QuickCustomerFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function QuickCustomerForm({ onSuccess, onCancel }: QuickCustomerFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePhoneBlur = () => {
    if (phone) {
      setPhone(formatPhone(phone));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Por favor, preencha o nome do cliente.",
        variant: "destructive"
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: "Telefone obrigatório",
        description: "Por favor, preencha o telefone do cliente.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const customerData = {
        name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        lead_source: 'manual',
        lead_status: 'new'
      };

      const { error } = await supabase
        .from('customers')
        .insert(customerData);

      if (error) throw error;

      toast({
        title: "Cliente cadastrado!",
        description: "Cliente adicionado com sucesso."
      });

      // Limpar formulário
      setName('');
      setPhone('');
      onSuccess();
    } catch (error: any) {
      console.error("Error saving customer:", error);
      toast({
        title: "Erro ao salvar cliente",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Cadastro Rápido
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="quick-name">Nome *</Label>
            <Input
              id="quick-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="quick-phone">Telefone *</Label>
            <Input
              id="quick-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}