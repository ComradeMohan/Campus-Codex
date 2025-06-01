
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Settings, Palette, KeyRound, SlidersHorizontal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [siteName, setSiteName] = useState('Campus Codex');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#29ABE2'); // Default from current theme
  const [accentColor, setAccentColor] = useState('#90EE90'); // Default from current theme

  const handleSaveChanges = (section: string) => {
    // In a real application, you would save these settings to a backend/database
    toast({
      title: `${section} Settings Saved (Simulated)`,
      description: `Your changes to ${section.toLowerCase()} settings have been noted. (This is a UI demo)`,
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline flex items-center">
          <Settings className="w-8 h-8 mr-3 text-primary" />
          System Settings
        </h1>
        <Button asChild variant="outline">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <SlidersHorizontal className="w-5 h-5 mr-2 text-primary" />
            General Settings
          </CardTitle>
          <CardDescription>Basic configuration for the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteName">Platform Name</Label>
            <Input
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Your Platform Name"
            />
          </div>
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="maintenanceMode"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
            <Label htmlFor="maintenanceMode" className="cursor-pointer">
              Enable Maintenance Mode
            </Label>
          </div>
           <Button onClick={() => handleSaveChanges('General')} className="mt-2">Save General Settings</Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <Palette className="w-5 h-5 mr-2 text-primary" />
            Theme Customization
          </CardTitle>
          <CardDescription>Adjust the look and feel of the platform (UI Demo Only).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
              <Input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#RRGGBB"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">Note: Changing colors here is a UI demo and won't update the actual theme.</p>
          </div>
           <div className="space-y-2">
            <Label htmlFor="accentColor">Accent Color</Label>
             <div className="flex items-center gap-2">
              <Input
                id="accentColor"
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-16 h-10 p-1"
              />
               <Input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#RRGGBB"
                className="flex-1"
              />
            </div>
          </div>
          <Button onClick={() => handleSaveChanges('Theme')} className="mt-2">Save Theme Settings</Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <KeyRound className="w-5 h-5 mr-2 text-primary" />
            Integration Settings
          </CardTitle>
          <CardDescription>Manage API keys and third-party service integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="judgeApiKey">Code Execution API Key (e.g., Judge0)</Label>
            <Input
              id="judgeApiKey"
              type="password"
              placeholder="Enter API Key"
              defaultValue="**********"
            />
             <p className="text-xs text-muted-foreground">This is a placeholder. Actual API key is managed via .env files.</p>
          </div>
          <Button onClick={() => handleSaveChanges('Integration')} className="mt-2" disabled>Save Integration Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
