"use client";

import { motion } from "framer-motion";
import { containerVariants, cardVariants } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  // FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/components/password-input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { AnimatedSpinner } from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { User } from "@/db/schema";
import { deleteUserAccount, updateUserSettings } from "@/lib/settings/actions";
import * as Sentry from "@sentry/react";
import { useSurveyTriggers } from "@/lib/hooks/use-survey-triggers";

const settingsFormSchema = z.object({
  email: z.string().email(),
  // notifications: z.object({
  //   emailUpdates: z.boolean(),
  //   newFeatures: z.boolean(),
  //   marketingEmails: z.boolean(),
  // }),
  password: z
    .object({
      current: z.string().min(1, "Please provide your current password").max(255),
      new: z.string().min(8, "Please provide a password with at least 8 characters").max(255),
      confirm: z.string().min(8, "Please provide a password with at least 8 characters").max(255),
    })
    .optional()
    .refine(
      (data) => {
        if (!data?.new && !data?.current && !data?.confirm) return true;
        if (data?.new && data?.current && data?.confirm) {
          return data.new === data.confirm;
        }
        return false;
      },
      {
        message: "New passwords must match and current password is required",
      }
    ),
});

type SettingsFormProps = {
  user: User;
};

export function SettingsForm({ user }: SettingsFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const { triggerFeedbackRequest } = useSurveyTriggers();

  const form = useForm({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      email: user.email,
      // notifications: {
      //   emailUpdates: true,
      //   newFeatures: true,
      //   marketingEmails: false,
      // },
      password: {
        current: "",
        new: "",
        confirm: "",
      },
    },
  });

  async function onSubmit(data: z.infer<typeof settingsFormSchema>) {
    setIsLoading(true);
    try {
      const result = await updateUserSettings({
        userId: user.id,
        email: data.email,
        currentPassword: data.password?.current,
        newPassword: data.password?.new,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Settings updated successfully");
        form.reset(data);
      }
    } catch (error) {
      toast.error("Failed to update settings. Please try again.");
      Sentry.captureException(error);
    }
    setIsLoading(false);
  }

  // const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     // TODO: Implement avatar upload logic
  //     const reader = new FileReader();
  //     reader.onload = (e) => {
  //       setAvatarUrl(e.target?.result as string);
  //       setSuccess("Profile picture updated successfully");
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      const result = await deleteUserAccount(user.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Account deleted successfully");
        // Redirect to home page or logout
        window.location.href = "/dashboard";
      }
    } catch (error) {
      toast.error("Failed to delete account. Please try again.");
      Sentry.captureException(error);
    }
    setIsLoading(false);
    setIsDeleteDialogOpen(false);
  };

  return (
    <Form {...form}>
      <motion.form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and profile picture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar || "/placeholder-avatar.png"} />
                  <AvatarFallback>{user.email.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar" className="mb-2 block">
                    Profile Picture
                  </Label>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    // onChange={handleAvatarUpload}
                    className="max-w-xs"
                    disabled
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="Enter your email" disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>Choose what updates you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="notifications.emailUpdates"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Email Updates</FormLabel>
                    <FormDescription>Receive emails about your account activity</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifications.newFeatures"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>New Features</FormLabel>
                    <FormDescription>
                      Get notified about new features and improvements
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notifications.marketingEmails"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Marketing Emails</FormLabel>
                    <FormDescription>
                      Receive emails about new products and promotions
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card> */}

        {user.hashedPassword && (
          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>Update your password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password.current"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <PasswordInput {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password.new"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password</FormLabel>
                        <FormControl>
                          <PasswordInput {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password.confirm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm New Password</FormLabel>
                        <FormControl>
                          <PasswordInput {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={cardVariants}>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Help Shape the Future</CardTitle>
              <CardDescription>
                Share your detailed feedback to help improve UsabiliTree. Your insights are
                invaluable for the upcoming overhaul!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-muted-foreground">
                  🎁 <strong>Special Thank You:</strong> Users who complete the detailed feedback
                  survey will receive a discount code once the overhaul is finished.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => triggerFeedbackRequest("settings_page")}
                className="w-full"
              >
                Share Detailed Feedback
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <div className="flex items-center justify-between">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <AnimatedSpinner className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Account</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to delete your account? This action cannot be undone.
                    Please type your email to confirm.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-confirm">Email</Label>
                    <Input
                      id="email-confirm"
                      placeholder={user.email}
                      value={deleteConfirmEmail}
                      onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={isLoading || deleteConfirmEmail !== user.email}
                  >
                    {isLoading && <AnimatedSpinner className="mr-2 h-4 w-4" />}
                    Delete Account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>
      </motion.form>
    </Form>
  );
}
