import heroImage from "@/assets/hero-supplements.jpg";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative overflow-hidden">
      <div className="container grid gap-10 py-14 md:grid-cols-2 md:py-20">
        <div className="flex flex-col justify-center">
          <span className="inline-block w-fit rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">Entrega rápida para todo o Brasil</span>
          <h1 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
            Suplementos premium para sua melhor performance
          </h1>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Whey, multivitamínicos, ômega‑3 e muito mais. Qualidade certificada, preços justos e ofertas semanais.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button variant="hero" size="lg">Comprar agora</Button>
            <a href="#produtos" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Ver produtos</a>
          </div>
        </div>
        <div className="relative">
          <div className="absolute -inset-10 -z-10 rounded-[2rem] opacity-30 blur-2xl" style={{ backgroundImage: 'var(--gradient-primary)' }} aria-hidden="true" />
          <img
            src={heroImage}
            alt="Linha premium de suplementos: whey, multivitamínico e ômega‑3"
            loading="eager"
            className="mx-auto w-full max-w-[680px] rounded-xl shadow-xl animate-float"
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
