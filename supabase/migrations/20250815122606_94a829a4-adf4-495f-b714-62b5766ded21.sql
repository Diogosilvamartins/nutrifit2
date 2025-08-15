-- Atualizar produtos com base no catálogo da Celliv

-- Biotina
UPDATE products SET 
  image_url = '/lovable-uploads/ec5bf244-55a8-4f68-827f-4f842753109e.png',
  description = 'Suplemento alimentar em cápsulas. A Biotina contribui para a manutenção do cabelo e da pele. A Biotina auxilia no metabolismo energético. FRASCO | 60 CÁPSULAS | 500MG CADA'
WHERE name ILIKE '%biotina%';

-- Café Verde (se houver produto similar)
UPDATE products SET 
  image_url = '/lovable-uploads/ec5bf244-55a8-4f68-827f-4f842753109e.png',
  description = 'Suplemento alimentar em cápsulas. Com os Aminoácidos Arginina, Taurina e Tirosina. Enriquecido com a Vitamina A, B6, C, E e Cromo. FRASCO | 60 CÁPSULAS | 500MG CADA'
WHERE name ILIKE '%café verde%' OR name ILIKE '%cafe verde%';

-- Cálcio (buscar produtos com cálcio)
UPDATE products SET 
  image_url = '/lovable-uploads/ec5bf244-55a8-4f68-827f-4f842753109e.png',
  description = 'Suplemento alimentar em cápsulas. O Cálcio e a Vitamina D auxiliam na formação e manutenção de ossos e dentes. O Magnésio auxilia no funcionamento Neuromuscular. A Vitamina K auxilia na manutenção dos ossos. FRASCO | 60 CÁPSULAS | 500MG CADA'
WHERE name ILIKE '%cálcio%' OR name ILIKE '%calcio%';

-- Magnésio
UPDATE products SET 
  image_url = '/lovable-uploads/ec5bf244-55a8-4f68-827f-4f842753109e.png',
  description = 'Suplemento alimentar em cápsulas. O Magnésio auxilia na formação de ossos e dentes, no funcionamento muscular e Neuromuscular, além de auxiliar no metabolismo energético. FRASCO | 60 CÁPSULAS | 500MG CADA'
WHERE name ILIKE '%magnésio%' OR name ILIKE '%magnesio%' OR name ILIKE '%cloreto%';

-- 5 Magnésio ou similar
UPDATE products SET 
  image_url = '/lovable-uploads/ec5bf244-55a8-4f68-827f-4f842753109e.png',
  description = 'Suplemento alimentar em cápsulas. Constituído por 5 fontes de Magnésio (Bisglicinato, Malato, Taurato, Óxido e Gaba do Magnésio do Ácido Cítrico). FRASCO | 60 CÁPSULAS | 500MG CADA'
WHERE name ILIKE '%7 magnésio%' OR name ILIKE '%magnésios%';