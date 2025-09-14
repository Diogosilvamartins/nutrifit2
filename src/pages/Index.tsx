import Header from "@/components/site/Header";
import Hero from "@/components/site/Hero";
import ProductGrid from "@/components/site/ProductGrid";
import Footer from "@/components/site/Footer";
import { MobileHero } from "@/components/mobile/MobileHero";
import { MobileProductGrid } from "@/components/mobile/MobileProductGrid";
import { useMobileDetection } from "@/hooks/useMobileDetection";
import { useEffect } from "react";

const Index = () => {
  const { isMobile } = useMobileDetection();
  
  useEffect(() => {
    const base = window.location.origin;
    const img = `${base}/og-image.jpg`;
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'Product',
          name: 'Whey Protein Isolado 900g',
          image: img,
          offers: { '@type': 'Offer', priceCurrency: 'BRL', price: '189.90', availability: 'https://schema.org/InStock' }
        },
        {
          '@type': 'Product',
          name: 'Multivitamínico Diário',
          image: img,
          offers: { '@type': 'Offer', priceCurrency: 'BRL', price: '59.90', availability: 'https://schema.org/InStock' }
        },
        {
          '@type': 'Product',
          name: 'Ômega‑3 Ultra 1000mg',
          image: img,
          offers: { '@type': 'Offer', priceCurrency: 'BRL', price: '79.90', availability: 'https://schema.org/InStock' }
        },
      ]
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  return (
    <div>
      <Header />
      <main>
        {isMobile ? (
          <>
            <MobileHero />
            <MobileProductGrid />
          </>
        ) : (
          <>
            <Hero />
            <ProductGrid />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
