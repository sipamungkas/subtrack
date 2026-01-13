import { MessageCircle, Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto py-6 border-t border-border/30 bg-background/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Need help?{' '}
          <a
            href="https://t.me/SubnudgeSupport_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat with us on Telegram
          </a>
          {' '}or email{' '}
          <a
            href="mailto:support@subnudge.app"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Mail className="h-3.5 w-3.5" />
            support@subnudge.app
          </a>
        </p>
      </div>
    </footer>
  )
}
