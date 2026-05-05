"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Save, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageWrapper } from "@/components/Layout/PageWrapper";
import { Card } from "@/components/ui/card";
import { RichTextEditor } from "@/components/Editor/RichTextEditor";
import { articleService } from "@/services/article.service";
import { useAuth } from "@/contexts/AuthContext";

const articleSchema = z.object({
  title: z.string().min(3, "Le titre doit faire au moins 3 caractères"),
  image: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  link: z.string().url("Veuillez entrer une URL valide").optional().or(z.literal("")),
  content: z.string().min(10, "Le contenu est trop court"),
});

type ArticleFormValues = z.infer<typeof articleSchema>;

export default function CreateArticlePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: "",
      image: "",
      link: "",
      content: "",
    },
  });

  // Protection de la route
  if (authLoading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  if (!user || (!user.isPro && user.role !== "admin")) {
    router.replace("/news");
    return null;
  }

  const onSubmit = async (data: ArticleFormValues) => {
    try {
      setIsSubmitting(true);
      
      const article = await articleService.create({
        title: data.title,
        content: data.content,
        image: data.image || undefined,
        link: data.link || undefined,
        publishedAt: new Date().toISOString(), // On publie directement pour l'MVP
      });
      
      toast.success("Article créé avec succès !");
      router.push(`/news/${article.id}`);
    } catch (error) {
      console.error("Failed to create article:", error);
      toast.error("Erreur lors de la création de l'article.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper maxWidth="lg" gradient="muted" className="py-8">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rédiger un article</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Partagez une actualité, une annonce de tournoi ou un résumé d&apos;événement.
            </p>
          </div>
        </div>

        <Card className="p-6 md:p-8 border-border/50 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre de l&apos;article <span className="text-destructive">*</span></Label>
              <Input 
                id="title" 
                placeholder="Ex: Résumé du tournoi régional d'Île-de-France..." 
                {...register("title")} 
                className={errors.title ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Image de couverture (URL R2 ou externe)</Label>
              <div className="flex gap-2">
                <Input 
                  id="image" 
                  placeholder="https://cdn.tcg-nexus.org/..." 
                  {...register("image")} 
                  className={errors.image ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                <Button type="button" variant="outline" className="shrink-0 gap-2" disabled title="Bientôt disponible">
                  <UploadCloud className="h-4 w-4" />
                  <span className="hidden sm:inline">Uploader</span>
                </Button>
              </div>
              {errors.image && (
                <p className="text-sm text-destructive mt-1">{errors.image.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">L&apos;upload direct vers R2 sera bientôt disponible. Pour le moment, utilisez une URL publique.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Lien vers le tournoi associé (Optionnel)</Label>
              <Input 
                id="link" 
                placeholder="https://tcg-nexus.org/tournaments/..." 
                {...register("link")} 
                className={errors.link ? "border-destructive focus-visible:ring-destructive" : ""}
              />
              {errors.link && (
                <p className="text-sm text-destructive mt-1">{errors.link.message}</p>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Label>Contenu <span className="text-destructive">*</span></Label>
              <Controller
                name="content"
                control={control}
                render={({ field }) => (
                  <RichTextEditor
                    content={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.content && (
                <p className="text-sm text-destructive mt-1">{errors.content.message}</p>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" className="gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Publication en cours...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Publier l&apos;article
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </PageWrapper>
  );
}
