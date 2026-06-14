import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import tripsyLogo from "@/assets/tripsy-logo.png";
import authBg from "@/assets/auth-bg.jpg";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          toast({ title: "Nama tidak boleh kosong", variant: "destructive" });
          setLoading(false);
          return;
        }
        if (!/^[^\s@]+@gmail\.com$/i.test(email.trim())) {
          toast({
            title: "Email harus menggunakan @gmail.com",
            description: 'Contoh: "username"@gmail.com',
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        // Langsung masuk ke web app tanpa diminta login ulang.
        // Jika konfirmasi email diaktifkan, signUp tetap mengembalikan sesi
        // saat "Confirm email" dimatikan; jika tidak, lakukan signIn otomatis.
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        toast({ title: "Akun berhasil dibuat!", description: "Selamat datang di Tripsy." });
        navigate("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${authBg})` }}
    >
      {/* Subtle overlay for legibility */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Top bar */}
      <Link
        to="/"
        className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white transition-colors z-20 drop-shadow"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
      </Link>

      <button
        onClick={() => {
          setIsSignUp(!isSignUp);
          setName("");
          setEmail("");
          setPassword("");
        }}
        className="absolute top-5 right-5 z-20 px-5 py-1.5 rounded-md bg-[#2c3fa8] text-white text-sm font-semibold shadow-md hover:bg-[#243490] transition-colors"
      >
        {isSignUp ? "Masuk" : "Daftar"}
      </button>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="rounded-3xl p-8 border border-white/30 bg-white/15 backdrop-blur-2xl shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-white/90 flex items-center justify-center shadow-lg mb-4">
              <img src={tripsyLogo} alt="Tripsy logo" className="h-10 w-10" />
            </div>
            <h1 className="text-3xl font-bold font-serif text-white drop-shadow">
              {isSignUp ? "Buat Akun Baru" : "Selamat Datang"}
            </h1>
            <p className="text-white/80 text-sm mt-1 text-center">
              {isSignUp
                ? "Daftar untuk mulai merencanakan perjalananmu"
                : "Masuk untuk melanjutkan perjalananmu"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-white font-medium">Nama Lengkap</Label>
                <Input
                  id="name"
                  placeholder="Masukkan nama lengkap"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isSignUp}
                  maxLength={100}
                  className="h-11 bg-white/15 border-white/25 text-white placeholder:text-white/60 backdrop-blur-md focus-visible:ring-white/40"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-white font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="h-11 bg-white/15 border-white/25 text-white placeholder:text-white/60 backdrop-blur-md focus-visible:ring-white/40"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-white font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  maxLength={72}
                  className="h-11 bg-white/15 border-white/25 text-white placeholder:text-white/60 backdrop-blur-md focus-visible:ring-white/40 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 mt-2 bg-[#2c3fa8] hover:bg-[#243490] text-white border-0 shadow-lg transition-all font-semibold text-base"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isSignUp ? "Daftar" : "Masuk"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
