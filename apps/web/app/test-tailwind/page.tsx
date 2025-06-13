import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Test Tailwind v4 + Shadcn/UI
        </h1>

        {/* Test des couleurs personnalisées */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[color:var(--color-primary)] text-white">
            <CardHeader>
              <CardTitle>Couleur Primaire</CardTitle>
            </CardHeader>
            <CardContent>
              <p>#b80c09 - Rouge principal</p>
            </CardContent>
          </Card>

          <Card className="bg-[color:var(--color-secondary)] text-white">
            <CardHeader>
              <CardTitle>Couleur Secondaire</CardTitle>
            </CardHeader>
            <CardContent>
              <p>#0b4f6c - Bleu secondaire</p>
            </CardContent>
          </Card>

          <Card className="bg-[color:var(--color-success)] text-white">
            <CardHeader>
              <CardTitle>Couleur Success</CardTitle>
            </CardHeader>
            <CardContent>
              <p>#01baef - Bleu clair</p>
            </CardContent>
          </Card>
        </div>

        {/* Test des composants Shadcn/UI */}
        <Card>
          <CardHeader>
            <CardTitle>Composants Shadcn/UI</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button>Button Default</Button>
              <Button variant="secondary">Button Secondary</Button>
              <Button variant="outline">Button Outline</Button>
              <Button variant="destructive">Button Destructive</Button>
            </div>

            <div className="p-4 rounded-md bg-muted">
              <p className="text-muted-foreground">
                Zone avec couleur muted et texte muted-foreground
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Test des utilitaires Tailwind v4 */}
        <Card>
          <CardHeader>
            <CardTitle>Test Utilitaires Tailwind v4</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-accent rounded-lg">
                <p className="text-accent-foreground">Zone accent</p>
              </div>
              <div className="p-4 bg-card border border-border rounded-lg">
                <p className="text-card-foreground">Zone card avec border</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test des animations */}
        <Card>
          <CardHeader>
            <CardTitle>Test Animations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-primary rounded-full animate-pulse"></div>
              <div className="w-16 h-16 bg-secondary rounded-lg animate-bounce"></div>
              <div className="w-16 h-16 bg-[color:var(--color-success)] rounded-lg hover:scale-110 transition-transform"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
