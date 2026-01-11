import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
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
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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

    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

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
      await api.post(
        "/api/auth/request-password-reset",
        {
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        },
        {
          headers: {
            "x-captcha-response": captchaToken,
          },
        }
      );

      setIsSubmitted(true);
      toast({
        title: "Check your email",
        description: "If an account exists, you'll receive a password reset link",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      // Reset captcha on error so user can retry
      setCaptchaToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] animate-fade-in">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold gradient-text">Check Your Email</h1>
            <p className="text-muted-foreground">
              We've sent a password reset link to
            </p>
            <p className="font-medium text-foreground">{email}</p>
          </div>

          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Click the link in the email to reset your password.
                  If you don't see it, check your spam folder.
                </p>
                <p className="text-sm text-muted-foreground">
                  The link will expire in 1 hour.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setIsSubmitted(false)}
              >
                <Mail className="h-4 w-4" />
                Try a different email
              </Button>
              <Link to="/login" className="w-full">
                <Button variant="ghost" className="w-full gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign In
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold gradient-text">Forgot Password?</h1>
          <p className="text-muted-foreground">
            No worries, we'll send you reset instructions
          </p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              Enter the email associated with your account
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

              {/* Turnstile CAPTCHA */}
              <Turnstile
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
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6">
            <Link to="/login" className="w-full">
              <Button variant="ghost" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
