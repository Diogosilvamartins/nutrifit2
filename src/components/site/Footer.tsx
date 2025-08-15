const Footer = () => {
  return (
    <footer id="contato" className="border-t">
      <div className="container py-10 text-sm text-muted-foreground">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p>&copy; {new Date().getFullYear()} Nutri & Fit Suplemento Nutricional. Todos os direitos reservados.</p>
            <address className="not-italic">
              Av. Rio Doce, 1075 Ilha - Governador Valadares/MG - CEP 35.020-500
            </address>
          </div>
          <nav className="flex items-center gap-6" aria-label="Links do rodapé">
            <a href="#" className="hover:text-foreground">Política de Privacidade</a>
            <a href="#" className="hover:text-foreground">Termos de Uso</a>
            <a href="#" className="hover:text-foreground">Ajuda</a>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
