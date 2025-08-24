import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, PlusCircle, CheckCircle2, MapPin, Truck, Store, ChevronRight } from "lucide-react";

export default function FreshflowApp() {
  // 0 Splash | 1 Login | 2 Home | 3 Builder | 4 Cart/Resumo
  // 5 Address | 6 Delivery | 7 Payment | 8 Success
  const [step, setStep] = useState(0);

  // Endereço & Entrega
  const [address, setAddress] = useState({
    name: "",
    street: "",
    number: "",
    district: "",
    city: "",
    zip: "",
  });
  const [delivery, setDelivery] = useState(/** "delivery" | "pickup" */ "delivery");

  const isAddressValid =
    address.name &&
    address.street &&
    address.number &&
    address.district &&
    address.city &&
    address.zip;

  // (Opcional) Mock preencher por geolocalização
  const useMockGeo = () => {
    setAddress({
      name: address.name || "Pedro Berti",
      street: "Av. Atlântica",
      number: "123",
      district: "Centro",
      city: "Ilhabela",
      zip: "11630-000",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 via-pink-500 to-orange-400 text-white font-bold">
      {/* Splash */}
      {step === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h1 className="text-6xl mb-4 drop-shadow-xl">Freshflow</h1>
          <p className="text-lg italic mb-8">Seu suco, do seu jeito 🍹</p>
          <Button
            className="rounded-2xl bg-yellow-400 text-purple-700 px-6 py-3 text-lg shadow-lg"
            onClick={() => setStep(1)}
          >
            Entrar
          </Button>
        </motion.div>
      )}

      {/* Login */}
      {step === 1 && (
        <motion.div
          className="flex flex-col items-center justify-center h-screen p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="text-3xl mb-6">Login / Cadastro</h2>
          <Button className="mb-4 bg-white text-purple-800 rounded-xl px-6" onClick={() => setStep(2)}>
            Entrar com Google
          </Button>
          <Button className="mb-4 bg-white text-purple-800 rounded-xl px-6" onClick={() => setStep(2)}>
            Entrar com Apple
          </Button>
          <Button className="bg-green-400 text-purple-900 rounded-xl px-6" onClick={() => setStep(2)}>
            Entrar com Email
          </Button>
        </motion.div>
      )}

      {/* Home */}
      {step === 2 && (
        <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-4">Bem-vindo à Freshflow 🌈</h2>
          <Card className="mb-6 bg-white/20 text-white rounded-2xl">
            <CardContent className="p-4">
              <h3 className="text-xl mb-2">Monte seu Suco</h3>
              <Button className="bg-green-400 text-purple-900 rounded-xl" onClick={() => setStep(3)}>
                Criar Agora <PlusCircle className="ml-2" />
              </Button>
            </CardContent>
          </Card>

          <h3 className="text-xl mb-3">Sugestões do dia</h3>
          <div className="grid grid-cols-2 gap-4">
            {["Tropical Power", "Detox Verde", "Explosão Cítrica", "Fresh Energy"].map((s, i) => (
              <Card key={i} className="bg-white/20 text-white rounded-2xl p-4">
                {s}
              </Card>
            ))}
          </div>
        </motion.div>
      )}

      {/* Builder */}
      {step === 3 && (
        <motion.div className="p-6" initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h2 className="text-3xl mb-4">Monte seu Suco 🍇🥭🥬</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {["Maçã", "Laranja", "Couve", "Limão", "Manga", "Gengibre", "Abacaxi", "Hortelã"].map((f, i) => (
              <Card key={i} className="bg-white/20 text-center rounded-2xl p-4 cursor-pointer hover:bg-white/30">
                {f}
              </Card>
            ))}
          </div>
          <Button className="bg-yellow-400 text-purple-800 rounded-xl" onClick={() => setStep(4)}>
            Finalizar <ShoppingCart className="ml-2" />
          </Button>
        </motion.div>
      )}

      {/* Resumo (Carrinho simples) */}
      {step === 4 && (
        <motion.div className="p-6" initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <h2 className="text-3xl mb-4">Resumo do Pedido 🛒</h2>
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4">
            <h3 className="text-xl mb-2">Suco Personalizado</h3>
            <p>Ingredientes: Maçã, Couve, Limão</p>
            <p className="mt-2">Preço: R$ 18,90</p>
          </Card>
          <div className="flex gap-3">
            <Button className="bg-white/20 text-white border border-white/30 rounded-xl" onClick={() => setStep(3)}>
              Editar
            </Button>
            <Button className="bg-green-400 text-purple-900 rounded-xl" onClick={() => setStep(5)}>
              Escolher Entrega <ChevronRight className="ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Endereço */}
      {step === 5 && (
        <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-4 flex items-center gap-2"><MapPin /> Endereço de Entrega</h2>

          <Card className="bg-white/20 rounded-2xl">
            <CardContent className="p-4 grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm opacity-90">Nome</label>
                <input
                  className="mt-1 w-full rounded-xl px-3 py-2 bg-white/85 text-purple-800 border-none outline-none"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  placeholder="Seu nome"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-sm opacity-90">Rua</label>
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-white/85 text-purple-800 border-none outline-none"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    placeholder="Ex.: Av. Atlântica"
                  />
                </div>
                <div>
                  <label className="text-sm opacity-90">Número</label>
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-white/85 text-purple-800 border-none outline-none"
                    value={address.number}
                    onChange={(e) => setAddress({ ...address, number: e.target.value })}
                    placeholder="123"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm opacity-90">Bairro</label>
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-white/85 text-purple-800 border-none outline-none"
                    value={address.district}
                    onChange={(e) => setAddress({ ...address, district: e.target.value })}
                    placeholder="Centro"
                  />
                </div>
                <div>
                  <label className="text-sm opacity-90">Cidade</label>
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-white/85 text-purple-800 border-none outline-none"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="Ilhabela"
                  />
                </div>
                <div>
                  <label className="text-sm opacity-90">CEP</label>
                  <input
                    className="mt-1 w-full rounded-xl px-3 py-2 bg-white/85 text-purple-800 border-none outline-none"
                    value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                    placeholder="11630-000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-3 mt-4">
            <Button className="bg-white/20 text-white border border-white/30 rounded-xl" onClick={() => setStep(4)}>
              Voltar
            </Button>
            <Button className="bg-white/25 text-white rounded-xl" onClick={useMockGeo}>
              Usar localização (mock)
            </Button>
            <Button
              className={`rounded-xl ${isAddressValid ? "bg-green-400 text-purple-900" : "bg-white/30 text-white"}`}
              disabled={!isAddressValid}
              onClick={() => setStep(6)}
            >
              Continuar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tipo de Entrega */}
      {step === 6 && (
        <motion.div className="p-6" initial={{ x: 200, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h2 className="text-3xl mb-4">Como você quer receber?</h2>

          <div className="grid grid-cols-1 gap-4">
            <Card
              className={`rounded-2xl p-4 cursor-pointer transition ${delivery === "delivery" ? "ring-2 ring-yellow-300" : "hover:bg-white/25"}`}
              onClick={() => setDelivery("delivery")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Truck /> <div className="text-lg">Entrega Rápida (até 45 min)</div>
                </div>
                <div className="text-white/90">Taxa variável por distância</div>
              </div>
              {delivery === "delivery" && (
                <div className="mt-3 text-sm opacity-90">
                  Entregar em: {address.street}, {address.number} — {address.district}, {address.city} ({address.zip})
                </div>
              )}
            </Card>

            <Card
              className={`rounded-2xl p-4 cursor-pointer transition ${delivery === "pickup" ? "ring-2 ring-yellow-300" : "hover:bg-white/25"}`}
              onClick={() => setDelivery("pickup")}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Store /> <div className="text-lg">Retirada na Loja</div>
                </div>
                <div className="text-white/90">Grátis</div>
              </div>
              {delivery === "pickup" && (
                <div className="mt-3 text-sm opacity-90">
                  Loja: Rua das Frutas, 500 — Ilhabela • Atendimento: 9h–18h
                </div>
              )}
            </Card>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <Button className="bg-white/20 text-white border border-white/30 rounded-xl" onClick={() => setStep(5)}>
              Voltar
            </Button>
            <Button className="bg-green-400 text-purple-900 rounded-xl" onClick={() => setStep(7)}>
              Avançar para pagamento <ChevronRight className="ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Pagamento */}
      {step === 7 && (
        <motion.div className="p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h2 className="text-3xl mb-4">Pagamento 💳</h2>

          {/* Resumo de entrega */}
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4">
            <h3 className="text-xl mb-2">Entrega</h3>
            {delivery === "delivery" ? (
              <p className="text-sm opacity-90">
                Entrega Rápida em: {address.street}, {address.number} — {address.district}, {address.city} ({address.zip})
              </p>
            ) : (
              <p className="text-sm opacity-90">
                Retirada: Rua das Frutas, 500 — Ilhabela (9h–18h)
              </p>
            )}
          </Card>

          {/* Métodos de pagamento */}
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={() => setStep(8)}>
            Pix
          </Card>
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={() => setStep(8)}>
            Cartão de Crédito
          </Card>
          <Card className="bg-white/20 text-white rounded-2xl p-4 mb-4 cursor-pointer hover:bg-white/30" onClick={() => setStep(8)}>
            Carteiras Digitais
          </Card>

          <div className="flex items-center gap-3">
            <Button className="bg-white/20 text-white border border-white/30 rounded-xl" onClick={() => setStep(6)}>
              Voltar
            </Button>
          </div>
        </motion.div>
      )}

      {/* Confirmação */}
      {step === 8 && (
        <motion.div className="flex flex-col items-center justify-center h-screen p-6 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <CheckCircle2 className="text-green-300 w-20 h-20 mb-6" />
          <h2 className="text-3xl mb-2">Pedido Confirmado! 🎉</h2>
          <p className="text-lg mb-1">Seu suco Freshflow está a caminho 🍹✨</p>
          {delivery === "delivery" ? (
            <p className="text-sm opacity-90 mb-6">
              Entrega em: {address.street}, {address.number} — {address.district}, {address.city} ({address.zip})
            </p>
          ) : (
            <p className="text-sm opacity-90 mb-6">Retirar na loja: Rua das Frutas, 500 — Ilhabela</p>
          )}

          <Button className="bg-yellow-400 text-purple-900 rounded-xl" onClick={() => setStep(2)}>
            Voltar ao Início
          </Button>
        </motion.div>
      )}
    </div>
  );
}
