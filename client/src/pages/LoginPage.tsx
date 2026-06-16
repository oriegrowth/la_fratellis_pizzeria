import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';

interface LoginPageProps {
  sessionId: string;
  onLoginSuccess: () => void;
}

export default function LoginPage({ sessionId, onLoginSuccess }: LoginPageProps) {
  const [phone, setPhone] = useState('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!phone || phone.length < 11) {
      toast.error('Telefone inválido');
      return;
    }

    // Save phone to localStorage for quick access
    localStorage.setItem('customerPhone', phone);
    
    toast.success('Telefone salvo! Você será redirecionado ao carrinho.');
    setTimeout(() => {
      onLoginSuccess();
    }, 1000);
  };

  return (
    <div className="max-w-md mx-auto animate-fade-in">
      <Card className="p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Bem-vindo!</h2>
        <p className="text-gray-600 mb-6">
          Digite seu telefone para recuperar seus dados salvos ou começar um novo pedido.
        </p>

        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Telefone
            </label>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Seu telefone será usado para fazer pedidos e será salvo para futuras compras.
            </p>
          </div>

          <Button
            type="submit"
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            Continuar
            <ArrowRight size={20} />
          </Button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Dica:</strong> Você também pode preencher seus dados diretamente no carrinho. Todos os dados são salvos automaticamente para agilizar seus próximos pedidos!
          </p>
        </div>
      </Card>
    </div>
  );
}
