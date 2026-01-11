import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";

export function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token");
  const error = searchParams.get("error");

  useEffect(() => {
    if (error === "INVALID_TOKEN") {
      setTokenError("This password reset link is invalid or has expired.");
    } else if (!token && !error) {
      setTokenError("No reset token provided. Please request a new password reset link.");
    }
  }, [token, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({
        title: "Required Fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please make sure your passwords match",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({
        title: "Invalid Token",
        description: "No reset token found. Please request a new password reset.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await api.post("/api/auth/reset-password", {
        newPassword: password,
        token,
      });

      setIsSuccess(true);
      toast({
        title: "Password Reset",
        description: "Your password has been successfully reset",
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Token error state
  if (tokenError) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] animate-fade-in">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Invalid Link</h1>
            <p className="text-muted-foreground">{tokenError}</p>
          </div>

          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Password reset links expire after 1 hour for security reasons.
                  Please request a new link to continue.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6">
              <Link to="/forgot-password" className="w-full">
                <Button className="w-full gap-2">
                  Request New Link
                </Button>
              </Link>
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

  // Success state
  if (isSuccess) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] animate-fade-in">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold gradient-text">Password Reset!</h1>
            <p className="text-muted-foreground">
              Your password has been successfully changed
            </p>
          </div>

          <Card className="glass border-border/50">
            <CardContent className="pt-6">
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  You can now sign in with your new password.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t border-border/50 pt-6">
              <Button
                className="w-full gap-2"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Reset form
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
          <h1 className="text-3xl font-bold gradient-text">Set New Password</h1>
          <p className="text-muted-foreground">
            Create a strong password for your account
          </p>
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Reset Password</CardTitle>
            <CardDescription>
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="bg-background/50"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" />
                    Reset Password
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
