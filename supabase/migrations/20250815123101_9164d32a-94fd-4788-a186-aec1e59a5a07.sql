-- Atualizar apenas produtos que existem no sistema baseado na segunda página do catálogo

-- Coenzima Q10 (existe no sistema)
UPDATE products SET 
  image_url = '/lovable-uploads/f2a90cd9-16d0-4748-90a8-7bb6b2be7f4c.png',
  description = 'Suplemento alimentar em cápsulas. É uma substância presente em todas as células do nosso organismo, participando dos processos de produção de energia. A Coenzima Q10 é enriquecida com Vitamina E. FRASCO | 60 CÁPSULAS | 500MG CADA'
WHERE name ILIKE '%coenzima%' AND name ILIKE '%q10%';

-- Colágeno Tipo II (existe no sistema)
UPDATE products SET 
  image_url = '/lovable-uploads/f2a90cd9-16d0-4748-90a8-7bb6b2be7f4c.png',
  description = 'Suplemento alimentar em cápsulas. A Vitamina C auxilia na formação do Colágeno. A Vitamina B1 auxilia no metabolismo energético. O Colágeno Tipo II auxilia na formação de células vermelhas do sangue. A Niacina contribui para a manutenção da pele. FRASCO | 60 CÁPSULAS | 500MG CADA'
WHERE name ILIKE '%colágeno%' AND name ILIKE '%tipo ii%';

-- Complexo B (existe no sistema)
UPDATE products SET 
  image_url = '/lovable-uploads/f2a90cd9-16d0-4748-90a8-7bb6b2be7f4c.png',
  description = 'Suplemento alimentar em cápsulas. A Vitamina B1 auxilia no metabolismo energético. A Vitamina B2 é um antioxidante que auxilia na proteção dos danos causados pelos radicais livres. A Niacina auxilia no metabolismo energético. A Vitamina B6 auxilia no funcionamento do sistema imune. A Vitamina B12 auxilia na formação de células vermelhas do sangue. FRASCO | 60 CÁPSULAS | 500MG CADA'
WHERE name ILIKE '%complexo b%';