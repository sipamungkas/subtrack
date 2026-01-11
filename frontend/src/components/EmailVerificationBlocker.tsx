import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, ShieldAlert } from "lucide-react";

export function EmailVerificationBlocker() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user, sendVerificationOTP } = useAuth();

  if (!user) return null;

  const handleSendCode = async () => {
    setIsLoading(true);
    try {
      await sendVerificationOTP(user.email);
      toast({ title: "Code Sent", description: "Check your email for the verification code" });
      navigate(`/verify-email?email=${encodeURIComponent(user.email)}`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        title: "Error",
        description: err.response?.data?.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-warning/10 rounded-full">
              <ShieldAlert className="h-8 w-8 text-warning" />
            </div>
          </div>
          <CardTitle className="text-2xl">Verify Your Email</CardTitle>
          <CardDescription className="text-base">
            To continue using Subnudge, please verify your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">{user.email}</span>
          </div>

          <Button onClick={handleSendCode} className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending Code...
              </>
            ) : (
              "Send Verification Code"
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            A 6-digit code will be sent to your email address.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
