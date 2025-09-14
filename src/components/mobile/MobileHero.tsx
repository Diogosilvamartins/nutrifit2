import heroImage from "@/assets/hero-supplements.jpg";
import { Button } from "@/components/ui/button";

export const MobileHero = () => {
  return (
    <section className="relative overflow-hidden px-4 py-8">
      <div className="text-center">
        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs text-accent mb-4">
          Entrega rápida para todo o Brasil
        </span>
        
        <h1 className="font-display text-2xl leading-tight mb-4">
          Suplementos premium para sua melhor performance
        </h1>
        
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
          Whey, multivitamínicos, ômega‑3 e muito mais. Qualidade certificada, preços justos.
        </p>
        
        <div className="relative mb-6">
          <div className="absolute -inset-4 -z-10 rounded-xl opacity-20 blur-xl" 
               style={{ backgroundImage: 'var(--gradient-primary)' }} 
               aria-hidden="true" />
          <img
            src={heroImage}
            alt="Linha premium de suplementos: whey, multivitamínico e ômega‑3"
            loading="eager"
            className="w-full max-w-[280px] mx-auto rounded-lg shadow-lg"
          />
        </div>
        
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Button variant="hero" size="lg" className="w-full">
            Comprar agora
          </Button>
          <a 
            href="#produtos" 
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Ver produtos
          </a>
        </div>
      </div>
    </section>
  );
};