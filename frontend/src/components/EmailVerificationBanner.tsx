import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, X } from "lucide-react";

export function EmailVerificationBanner() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const navigate = useNavigate();
  const { user, isEmailVerified, sendVerificationOTP } = useAuth();

  // Don't show if user is not logged in, already verified, or dismissed
  if (!user || isEmailVerified || isDismissed) return null;

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
    <div className="bg-warning/10 border-b border-warning/20">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Mail className="h-5 w-5 text-warning flex-shrink-0" />
            <p className="text-sm text-warning-foreground">
              <span className="font-medium">Verify your email</span>
              <span className="hidden sm:inline"> to add subscriptions and access all features.</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendCode}
              disabled={isLoading}
              className="border-warning/30 hover:bg-warning/10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Sending...
                </>
              ) : (
                "Verify Now"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 p-0"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
