"use client";

import { useEffect, useMemo, useState } from "react";
import { adminService } from "@/services/admin.service";
import { User, UserRole } from "@/types/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface UserFormState {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  role: UserRole;
  isPro: boolean;
  isActive: boolean;
}

const emptyForm: UserFormState = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  role: UserRole.USER,
  isPro: false,
  isActive: true,
};

export function AdminUsersTable() {
  const t = useTranslations("AdminUsers");
  const locale = useLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [openModal, setOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminService.getUsers();
      setUsers(response);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const startCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setOpenModal(true);
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isPro: user.isPro,
      isActive: user.isActive,
    });
    setOpenModal(true);
  };

  const saveUser = async () => {
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser.id, {
          ...form,
          password: form.password || undefined,
        });
        toast.success(t("updated"));
      } else {
        await adminService.createUser(form);
        toast.success(t("created"));
      }
      setOpenModal(false);
      setForm(emptyForm);
      await loadUsers();
    } catch (err) {
      console.error("Unable to save user", err);
      toast.error(t("saveError"));
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await adminService.deleteUser(userToDelete.id);
      toast.success(t("deleted"));
      setUserToDelete(null);
      await loadUsers();
    } catch (err) {
      console.error("Unable to delete user", err);
      toast.error(t("deleteFailed"));
    }
  };

  const sortedUsers = useMemo(
    () =>
      [...users].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [users],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel utilisateur
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <div className="overflow-x-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>{t("lastName")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("pro")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                <TableHead>{t("createdAt")}</TableHead>
                <TableHead className="text-right">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center">
                    <Spinner size="small" />
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.id}</TableCell>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isPro ? "default" : "outline"}>
                        {user.isPro ? t("pro") : t("standard")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.isActive ? "secondary" : "destructive"}
                      >
                        {user.isActive ? t("active") : t("suspended")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Éditer ${user.email}`}
                        onClick={() => startEdit(user)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Supprimer ${user.email}`}
                        onClick={() => setUserToDelete(user)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground"
                  >
                    {t("empty")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? t("updateUser") : t("createUser")}
            </DialogTitle>
            <DialogDescription>{t("formSubtitle")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="firstName">{t("firstName")}</Label>
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    firstName: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName">{t("lastName")}</Label>
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, lastName: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={editingUser ? t("leaveEmptyToKeep") : ""}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("role")}</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, role: value as UserRole }))
                }
              >
                <SelectTrigger aria-label={t("role")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.ADMIN}>{t("admin")}</SelectItem>
                  <SelectItem value={UserRole.MODERATOR}>
                    {t("moderator")}
                  </SelectItem>
                  <SelectItem value={UserRole.USER}>{t("user")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{t("proAccount")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("allowProSales")}
                  </p>
                </div>
                <Switch
                  checked={form.isPro}
                  aria-label={t("proAccount")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isPro: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{t("activeAccount")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("blockOrReactivate")}
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  aria-label={t("activeAccount")}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpenModal(false)}>
              Annuler
            </Button>
            <Button onClick={saveUser}>
              {editingUser ? t("update") : t("create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(userToDelete)}
        onOpenChange={(open) => {
          if (!open) setUserToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("irreversible")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
