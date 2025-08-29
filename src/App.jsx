// Freshflow App with brand colors, logo, and deep-link support (?step=)
// Replace your current src/App.jsx with this file

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, PlusCircle, CheckCircle2, MapPin, Bike, Store } from "lucide-react";

export default function FreshflowApp() {
  const [step, setStep] = useState(0);

  // Deep-link: read ?step= on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = parseInt(params.get("step") || "", 10);
    if (!Number.isNaN(s)) setStep(s);
  }, []);

  // Keep URL in sync
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("step", String(step));
    window.history.replaceState(null, "", url.toString());
  }, [step]);

  return (
    <div className="min-h-screen bg-[#1B003A] bg-[radial-gradient(35%_50%_at_15%_20%,#F9D423_0%,transparent_60%),radial-gradient(45%_55%_at_85%_15%,#F72585_0%,transparent_60%),radial-gradient(60%_70%_at_50%_85%,#06B6D4_0%,transparent_60%)] text-white font-bold">
      {step === 0 && (
        <motion.div className="flex flex-col items-center justify-center h-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <img src="/logo-freshflow.svg" alt="Freshflow" className="w-[320px] mb-6 drop-shadow-xl" />
          <p className="text-lg italic mb-8 text-pink-200">Seu suco, do seu jeito 🍹</p>
          <Button className="rounded-2xl bg-[#F9D423] text-[#1B003A] px-6 py-3 text-lg shadow-lg" onClick={() => setStep(1)}>Entrar</Button>
        </motion.div>
      )}
      {/* demais telas seguem a mesma lógica do protótipo */}
    </div>
  );
}
