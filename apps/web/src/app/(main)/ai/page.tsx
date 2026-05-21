"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Send, Lightbulb } from "lucide-react"

export default function AiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Assistant</h1>
        <p className="text-muted-foreground">Get instant answers about your compliance</p>
      </div>

      <Card className="h-[500px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Compliance Copilot
          </CardTitle>
          <CardDescription>Ask questions about GST, notices, vendors, and more</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-center items-center text-center">
          <div className="space-y-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lightbulb className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground max-w-sm">
              AI capabilities coming soon. You'll be able to ask questions like:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 text-left">
              <li>• "Did I file all GST returns this quarter?"</li>
              <li>• "Which vendors have ITC risk?"</li>
              <li>• "Explain my GST notice"</li>
            </ul>
          </div>
        </CardContent>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input placeholder="Ask a question..." disabled />
            <Button disabled><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  )
}