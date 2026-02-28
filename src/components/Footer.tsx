import { Link } from "react-router-dom";
import tripsyLogo from "@/assets/tripsy-logo.png";

const Footer = () => (
  <footer className="bg-secondary text-secondary-foreground py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={tripsyLogo} alt="Tripsy.co logo" className="h-6 w-6" />
            <span className="text-lg font-bold font-serif">Tripsy</span>
          </div>
          <p className="text-secondary-foreground/70 text-sm max-w-xs">
            Platform perencana perjalanan personal untuk menjelajahi Indonesia dan dunia.
          </p>
        </div>
        <div className="flex gap-12">
          <div>
            <h4 className="font-semibold mb-3 text-sm">Produk</h4>
            <div className="space-y-2 text-sm text-secondary-foreground/70">
              <Link to="/explore" className="block hover:text-primary">Jelajahi</Link>
              <Link to="/itinerary" className="block hover:text-primary">Itinerary</Link>
              <Link to="/expenses" className="block hover:text-primary">Pengeluaran</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Perusahaan</h4>
            <div className="space-y-2 text-sm text-secondary-foreground/70">
              <a href="#" className="block hover:text-primary">Tentang</a>
              <a href="#" className="block hover:text-primary">Kontak</a>
              <a href="#" className="block hover:text-primary">Kebijakan Privasi</a>
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-secondary-foreground/10 mt-8 pt-6 text-center text-xs text-secondary-foreground/50">
        © 2026 Tripsy.co. All rights reserved.
      </div>
    </div>
  </footer>
);

export default Footer;
