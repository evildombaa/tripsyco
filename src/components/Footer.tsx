import { Link } from "react-router-dom";
import tripsyLogo from "@/assets/tripsy-logo.png";

const Footer = () => (
  <footer className="bg-foreground text-background py-16">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between gap-10">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <img src={tripsyLogo} alt="Tripsy.co logo" className="h-7 w-7" />
            <span className="text-lg font-bold font-serif">Tripsy</span>
          </div>
          <p className="text-background/50 text-sm leading-relaxed">
            Platform perencana perjalanan personal untuk menjelajahi Indonesia dan dunia.
          </p>
        </div>
        <div className="flex gap-16">
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-background/70">Produk</h4>
            <div className="space-y-3 text-sm text-background/50">
              <Link to="/explore" className="block hover:text-background transition-colors">Jelajahi</Link>
              <Link to="/itinerary" className="block hover:text-background transition-colors">Itinerary</Link>
              <Link to="/expenses" className="block hover:text-background transition-colors">Pengeluaran</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider text-background/70">Perusahaan</h4>
            <div className="space-y-3 text-sm text-background/50">
              <a href="#" className="block hover:text-background transition-colors">Tentang</a>
              <a href="#" className="block hover:text-background transition-colors">Kontak</a>
              <a href="#" className="block hover:text-background transition-colors">Kebijakan Privasi</a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-background/10 mt-12 pt-8 text-center text-xs text-background/30">
        © 2026 Tripsy.co. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
