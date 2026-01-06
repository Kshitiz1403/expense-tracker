import {
  Settings as SettingsIcon,
  User,
  Bell,
  Globe,
  Download,
  Trash2,
  Shield,
  Palette,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <CardTitle>Profile Information</CardTitle>
          </div>
          <CardDescription>
            Update your personal information and contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input placeholder="John Doe" defaultValue="Kshitiz Agrawal" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                placeholder="email@example.com"
                defaultValue="user@example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <Input placeholder="+91 98765 43210" defaultValue="+91 98765 43210" />
          </div>
          <div className="flex gap-2">
            <Button>Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Regional Preferences</CardTitle>
          </div>
          <CardDescription>
            Customize how dates, times, and currency are displayed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>
              <div className="flex items-center gap-2">
                <Input value="INR - Indian Rupee (₹)" disabled />
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Format</label>
              <div className="flex items-center gap-2">
                <Input value="DD/MM/YYYY" disabled />
                <Button variant="outline" size="sm">
                  Change
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Time Zone</label>
            <div className="flex items-center gap-2">
              <Input value="Asia/Kolkata (IST, UTC+5:30)" disabled />
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Control how and when you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Transaction Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when new transactions are detected
                </p>
              </div>
              <div className="bg-primary h-6 w-11 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full" />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Review Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Reminders for transactions pending review
                </p>
              </div>
              <div className="bg-primary h-6 w-11 rounded-full relative cursor-pointer">
                <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full" />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Budget Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Alerts when approaching category budget limits
                </p>
              </div>
              <div className="bg-muted h-6 w-11 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full" />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Weekly Summary</p>
                <p className="text-sm text-muted-foreground">
                  Weekly email summary of your financial activity
                </p>
              </div>
              <div className="bg-muted h-6 w-11 rounded-full relative cursor-pointer">
                <div className="absolute left-1 top-1 h-4 w-4 bg-white rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Customize the look and feel of the application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme</label>
            <div className="flex gap-2">
              <Button variant="default">Light</Button>
              <Button variant="outline" disabled>
                Dark
              </Button>
              <Button variant="outline" disabled>
                Auto
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Currently using light theme as configured
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            <CardTitle>Data Management</CardTitle>
          </div>
          <CardDescription>Export or manage your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Export All Data</p>
              <p className="text-sm text-muted-foreground">
                Download all your transactions and categories as CSV
              </p>
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Data Backup</p>
              <p className="text-sm text-muted-foreground">
                Last backup: Jan 5, 2026
              </p>
            </div>
            <Button variant="outline">Create Backup</Button>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">
                Update your account password
              </p>
            </div>
            <Button variant="outline">Change</Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security
              </p>
              <Badge variant="outline" className="mt-2">
                Not Enabled
              </Badge>
            </div>
            <Button variant="outline">Enable</Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible and destructive actions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete All Transactions</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete all transaction data
              </p>
            </div>
            <Button variant="destructive">Delete All</Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data
              </p>
            </div>
            <Button variant="destructive">Delete Account</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
