import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Turnstile } from "@/components/ui/turnstile";
import { toast } from "@/hooks/use-toast";
import { ArrowRight, Loader2 } from "lucide-react";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  const handleCaptchaError = () => {
    setCaptchaToken(null);
    toast({
      title: "CAPTCHA Error",
      description: "Failed to verify CAPTCHA. Please refresh and try again.",
      variant: "destructive",
    });
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate CAPTCHA token
    if (!captchaToken) {
      toast({
        title: "Verification Required",
        description: "Please complete the security check",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await signIn(email, password, captchaToken);
      toast({ title: "Welcome back!", description: "Signed in successfully" });
      navigate("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to sign in",
        variant: "destructive",
      });
      // Reset captcha on error so user can retry
      setCaptchaToken(null);
      setCaptchaKey((k) => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] animate-fade-in">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <img
              src="/subnudge-icon.webp"
              alt="Subnudge"
              className="h-14 w-14 rounded-2xl shadow-lg shadow-primary/25"
            />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to your Subnudge account
          </p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-background/50"
                />
              </div>

              {/* Turnstile CAPTCHA */}
              <Turnstile
                key={captchaKey}
                onVerify={handleCaptchaVerify}
                onError={handleCaptchaError}
                onExpire={handleCaptchaExpire}
                className="flex justify-center"
              />

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading || !captchaToken}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-primary hover:underline font-medium"
              >
                Create one
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
