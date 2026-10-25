# Ordenação por distância

O controle de tolerância adicional de distância foi removido da busca de produtos e da lista de compras. A ordenação por distância prioriza os locais mais próximos e usa o menor preço no empate, na precisão de distância exibida.

A busca principal não salva nem restaura a tolerância antiga; suas ofertas completas são reordenadas pela distância. A lista de compras não salva/restaura o parâmetro. Resultados de listas antigas escolhidos com tolerância positiva são desconsiderados ao restaurar o cache, pois a oferta mais próxima não pode ser reconstruída a partir de uma única oferta salva por item. Os códigos da lista permanecem disponíveis para uma nova comparação, sem consulta automática.

O raio da busca permanece disponível e não foi alterado. A ordenação de combustíveis dentro do raio permanece como já definida.
