import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, PlusCircle, CheckCircle2, MapPin, Bike, Store, ChevronRight } from "lucide-react";

export default function FreshflowApp() {
  // steps: 0 Splash | 1 Login | 2 Home | 3 Builder | 4 Cart | 5 Payment | 6 Success | 7 Address | 8 Delivery
  const [step, setStep] = useState(0);

  // Deep-link: read ?step= on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get("step") || "", 10);
    if (!Number.isNaN(s)) setStep(s);
  }, []);

  // Keep URL in sync when step changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(step));
    window.history.replaceState(null, "", url.toString());
  }, [step]);

  // Brand header (hidden only on Splash)
  const BrandBar = () => (
    <div className="sticky top-0 z-10 px-5 py-3 flex items-center gap-3 bg-[#1B003A]/70 backdrop-blur-md border-b border-white/10">
      <img src="/logo-freshflow.svg" alt="Freshflow" className="h-8 w-auto select-none" />
      <span className="text-white/80 text-sm">Seu suco, do seu jeito 🍹</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#1B003A] bg-[radial-gradient(35%_50%_at_15%_20%,#F9D423_0%,transparent_60%),radial-gradient(45%_55%_at_85%_15%,#F72585_0%,transparent_60%),radial-gradient(60%_70%_at_50%_85%,#06B6D4_0%,transparent_60%)] text-white font-bold">
      {/* Splash */}
      {step === 0 && (
        <motion.div className="flex flex-col items-center justify-center h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <img src="/logo-freshflow.svg" alt="Freshflow" className="w-[320px] mb-6 drop-shadow-xl" />
          <p className="text-lg italic mb-8 text-pink-200">Seu suco, do seu jeito 🍹</p>
          <Button className="rounded-2xl bg-[#F9D423] text-[#1B003A] px-6 py-3 text-lg shadow-lg" onClick={() => setStep(1)}>Entrar</Button>
        </motion.div>
      )}

      {step !== 0 && <BrandBar />}

      {/* Login */}
      {step === 1 && (
        <motion.div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-6 text-yellow-200">Login / Cadastro</h2>
          <Button className="mb-4 bg-white text-[#1B003A] rounded-xl px-6" onClick={() => setStep(2)}>Entrar com Google</Button>
          <Button className="mb-4 bg-white text-[#1B003A] rounded-xl px-6" onClick={() => setStep(2)}>Entrar com Apple</Button>
          <Button className="bg-[#22C55E] text-[#1B003A] rounded-xl px-6" onClick={() => setStep(2)}>Entrar com Email</Button>
        </motion.div>
      )}

      {/* Home */}
      {step === 2 && (
        <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-4 text-yellow-300">Bem-vindo à Freshflow 🌈</h2>
          <Card className="mb-6 bg-white/10 text-white rounded-2xl border border-white/20 backdrop-blur-md">
            <CardContent className="p-4">
              <h3 className="text-xl mb-2">Monte seu Suco</h3>
              <Button className="bg-[#22C55E] text-[#1B003A] rounded-xl" onClick={() => setStep(3)}>
                Criar Agora <PlusCircle className="ml-2" />
              </Button>
            </CardContent>
          </Card>

          <h3 className="text-xl mb-3">Sugestões do dia</h3>
          <div className="grid grid-cols-2 gap-4">
            {['Tropical Power', 'Detox Verde', 'Explosão Cítrica', 'Fresh Energy'].map((s, i) => (
              <Card key={i} className="bg-white/10 text-white rounded-2xl p-4 border border-white/20 backdrop-blur-md hover:bg-white/20 transition">{s}</Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Builder */}
      {step === 3 && (
        <motion.div className="p-6" initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h2 className="text-3xl mb-4 text-yellow-200">Monte seu Suco 🍇🥭🥬</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {['Maçã', 'Laranja', 'Couve', 'Limão', 'Manga', 'Gengibre', 'Abacaxi', 'Hortelã'].map((f, i) => (
              <Card key={i} className="bg-white/10 text-center rounded-2xl p-4 border border-white/20 backdrop-blur-md cursor-pointer hover:bg-white/20 transition shadow-md">{f}</Card>
            ))}
          </div>
          <Button className="bg-[#F9D423] text-[#1B003A] rounded-xl" onClick={() => setStep(4)}>
            Finalizar <ShoppingCart className="ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Cart */}
      {step === 4 && (
        <motion.div className="p-6" initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h2 className="text-3xl mb-4 text-yellow-200">Resumo do Pedido 🛒</h2>
          <Card className="bg-white/10 text-white rounded-2xl p-4 mb-4 border border-white/20 backdrop-blur-md">
            <h3 className="text-xl mb-2">Suco Personalizado</h3>
            <p>Ingredientes: Maçã, Couve, Limão</p>
            <p className="mt-2">Preço: R$ 18,90</p>
          </Card>
          <div className="flex gap-3">
            <Button className="bg-white/10 text-white border border-white/30 rounded-xl" onClick={() => setStep(3)}>
              Editar
            </Button>
            <Button className="bg-[#22C55E] text-[#1B003A] rounded-xl" onClick={() => setStep(7)}>
              Continuar <ChevronRight className="ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Address */}
      {step === 7 && (
        <motion.div className="p-6 min-h-[calc(100vh-56px)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-6 flex items-center text-yellow-200"><MapPin className="mr-2"/>Endereço de Entrega</h2>
          <input type="text" placeholder="Rua" className="w-full p-3 mb-3 rounded-xl text-black" />
          <input type="text" placeholder="Número" className="w-full p-3 mb-3 rounded-xl text-black" />
          <input type="text" placeholder="Bairro" className="w-full p-3 mb-3 rounded-xl text-black" />
          <input type="text" placeholder="Cidade" className="w-full p-3 mb-3 rounded-xl text-black" />
          <input type="text" placeholder="CEP" className="w-full p-3 mb-6 rounded-xl text-black" />
          <Button className="bg-[#06B6D4] text-[#1B003A] rounded-xl mb-4">Usar Localização Atual</Button>
          <Button className="bg-[#22C55E] text-[#1B003A] rounded-xl" onClick={() => setStep(8)}>Avançar</Button>
        </motion.div>
      )}

      {/* Delivery */}
      {step === 8 && (
        <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-6 text-yellow-200">Escolha a Entrega 🚚</h2>
          <Card className="bg-white/10 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/20 border border-white/20 backdrop-blur-md" onClick={() => setStep(5)}>
            <Bike className="inline-block mr-2"/> Entrega Rápida (até 45 min)
          </Card>
          <Card className="bg-white/10 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/20 border border-white/20 backdrop-blur-md" onClick={() => setStep(5)}>
            <Store className="inline-block mr-2"/> Retirada na Loja
          </Card>
        </motion.div>
      )}

      {/* Payment */}
      {step === 5 && (
        <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-4 text-yellow-200">Pagamento 💳</h2>
          <Card className="bg-white/10 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/20 border border-white/20 backdrop-blur-md" onClick={() => setStep(6)}>Pix</Card>
          <Card className="bg-white/10 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/20 border border-white/20 backdrop-blur-md" onClick={() => setStep(6)}>Cartão de Crédito</Card>
          <Card className="bg-white/10 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/20 border border-white/20 backdrop-blur-md" onClick={() => setStep(6)}>Carteiras Digitais</Card>
        </motion.div>
      )}

      {/* Success */}
      {step === 6 && (
        <motion.div className="flex flex-col items-center justify-center h-screen p-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <CheckCircle2 className="text-green-300 w-20 h-20 mb-6" />
          <h2 className="text-3xl mb-4 text-pink-200">Pedido Confirmado! 🎉</h2>
          <p className="text-lg mb-6">Seu suco Freshflow está a caminho 🍹✨</p>
          <Button className="bg-[#F9D423] text-[#1B003A] rounded-xl" onClick={() => setStep(2)}>Voltar ao Início</Button>
        </motion.div>
      )}
    </div>
  );
}
