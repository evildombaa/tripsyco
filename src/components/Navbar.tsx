import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import tripsyLogo from "@/assets/tripsy-logo.png";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const links = [
    { to: "/", label: "Beranda" },
    { to: "/explore", label: "Jelajahi" },
    { to: "/itinerary", label: "Itinerary" },
    
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src={tripsyLogo} alt="Tripsy.co logo" className="h-8 w-8 transition-transform group-hover:scale-110" />
          <span className="text-xl font-bold font-serif text-foreground tracking-tight">Tripsy</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <div className="h-6 w-6 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="text-muted-foreground">Masuk</Button>
              <Button size="sm" onClick={() => navigate("/auth")} className="gradient-primary border-0 shadow-md hover:shadow-lg transition-shadow">Daftar</Button>
            </>
          )}
        </div>

        <button className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden glass-strong border-t border-border/50 px-4 pb-4 pt-2 space-y-1 animate-fade-in">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setIsOpen(false)}
              className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === link.to ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-3 border-t border-border/50 mt-2">
            {user ? (
              <Button variant="ghost" size="sm" className="flex-1" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" /> Keluar
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="flex-1" onClick={() => { navigate("/auth"); setIsOpen(false); }}>Masuk</Button>
                <Button size="sm" className="flex-1 gradient-primary border-0" onClick={() => { navigate("/auth"); setIsOpen(false); }}>Daftar</Button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
