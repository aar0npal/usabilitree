import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StudyFormData } from "@/lib/types/tree-test";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownPreview } from "@/components/markdown-preview";
import { Card } from "@/components/ui/card";
import { SETUP_TOUR_STEP_IDS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LANGUAGE_PRESETS, TreeTestTranslation } from "@/lib/languages";
import { ChevronDown, Languages, HelpCircle } from "lucide-react";

interface MessagesTabProps {
  data: StudyFormData;
  onChange: (data: StudyFormData) => void;
}

export function MessagesTab({ data, onChange }: MessagesTabProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const applyLanguagePreset = (preset: TreeTestTranslation) => {
    setSelectedLanguage(preset.name);
    onChange({
      ...data,
      messages: {
        welcome: preset.messages.welcome,
        completion: preset.messages.completion,
      },
      customText: {
        ...preset.customText,
      },
    });
  };

  return (
    <div id={SETUP_TOUR_STEP_IDS.MESSAGES} className="space-y-6">
      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Languages className="h-5 w-5 text-muted-foreground sm:flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <Label className="text-base font-medium">Language Presets</Label>
            <p className="text-sm text-muted-foreground">
              Apply pre-translated text for different languages. This will replace all current text.
            </p>
          </div>
          <div className="flex items-center gap-2 sm:flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between sm:w-48">
                  <span className="flex items-center truncate">
                    {selectedLanguage || "Select a language..."}
                  </span>
                  <ChevronDown className="ml-1 h-4 w-4 flex-shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {LANGUAGE_PRESETS.map((preset) => (
                  <DropdownMenuItem key={preset.code} onClick={() => applyLanguagePreset(preset)}>
                    {preset.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Label>Welcome Message</Label>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <HelpCircle className="h-3 w-3" />
                Branding Help
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Branding Your Tree Test</DialogTitle>
                <DialogDescription>
                  Learn how to add your brand and customize the appearance of your tree test.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  To add images and branding, you&apos;ll need to host them externally using
                  services like Imgur, Cloudinary, or your company&apos;s CDN, then reference them
                  using markdown syntax.
                </p>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Adding Your Logo</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    You can add your company logo using markdown image syntax in any of the message
                    fields:
                  </p>
                  <code className="rounded bg-muted p-2 font-mono text-xs">
                    ![Your Logo](https://your-domain.com/logo.png)
                  </code>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Recommended Dimensions</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>
                      • <strong>Logo:</strong> 200x60px or similar aspect ratio
                    </li>
                    <li>
                      • <strong>Images:</strong> Max width 600px for optimal display
                    </li>
                    <li>
                      • <strong>Format:</strong> PNG, JPG, or SVG
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-medium">Best Practices</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Use high-quality images hosted on reliable services</li>
                    <li>• Ensure images are accessible (good alt text)</li>
                    <li>• Test on mobile devices for responsive display</li>
                    <li>• Keep file sizes reasonable for faster loading</li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              id="welcome"
              value={data.messages.welcome}
              onChange={(e) =>
                onChange({
                  ...data,
                  messages: { ...data.messages, welcome: e.target.value },
                })
              }
              placeholder="Enter welcome message (supports markdown)"
              className="min-h-[200px] font-mono"
            />
          </TabsContent>
          <TabsContent value="preview">
            <Card className="p-4">
              <MarkdownPreview content={data.messages.welcome} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-4">
        <Label>Completion Message</Label>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              id="completion"
              value={data.messages.completion}
              onChange={(e) =>
                onChange({
                  ...data,
                  messages: { ...data.messages, completion: e.target.value },
                })
              }
              placeholder="Enter completion message (supports markdown)"
              className="min-h-[200px] font-mono"
            />
          </TabsContent>
          <TabsContent value="preview">
            <Card className="p-4">
              <MarkdownPreview content={data.messages.completion} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-4">
        <Label>Study Completed Message</Label>
        <p className="text-sm text-muted-foreground">
          Message shown when the study status is set to &quot;completed&quot; (no longer accepting
          participants)
        </p>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              id="completedMessage"
              value={data.customText.completedMessage}
              onChange={(e) =>
                onChange({
                  ...data,
                  customText: { ...data.customText, completedMessage: e.target.value },
                })
              }
              placeholder="Message shown when study is completed (supports markdown)"
              className="min-h-[150px] font-mono"
            />
          </TabsContent>
          <TabsContent value="preview">
            <Card className="min-h-[150px] p-4">
              <MarkdownPreview content={data.customText.completedMessage} />
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        <p className="font-medium">Supported Markdown:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li># Heading 1</li>
          <li>## Heading 2</li>
          <li>* or - for bullet points</li>
          <li>_text_ for italics</li>
          <li>**text** for bold text</li>
          <li>[Link Text](url) for links</li>
          <li>![alt text](url) for images</li>
          <li>Enter for new line</li>
        </ul>
      </div>

      <div className="space-y-4">
        <Label className="text-lg font-semibold">Custom Text & Labels</Label>
        <p className="text-sm text-muted-foreground">
          Customize the text and labels used throughout the tree test. This is useful for
          translating the interface to different languages.
        </p>

        <div className="space-y-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Instructions Page</Label>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions Text</Label>
              <p className="text-sm text-muted-foreground">
                Instructions shown before the test begins. Use &quot;![](instruction-img)&quot; for
                the instruction image placeholder.
              </p>
              <Tabs defaultValue="edit" className="w-full">
                <TabsList>
                  <TabsTrigger value="edit">Edit</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="edit">
                  <Textarea
                    id="instructions"
                    value={data.customText.instructions}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        customText: { ...data.customText, instructions: e.target.value },
                      })
                    }
                    placeholder="Instructions shown before the test begins (supports markdown)"
                    className="min-h-[150px] font-mono"
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <Card className="min-h-[150px] p-4">
                    <MarkdownPreview content={data.customText.instructions} />
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startTest">Start Test Button</Label>
              <Input
                id="startTest"
                value={data.customText.startTest}
                onChange={(e) =>
                  onChange({
                    ...data,
                    customText: { ...data.customText, startTest: e.target.value },
                  })
                }
                placeholder="Text for the start test button"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextButton">
                Next Button
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (shown on welcome page)
                </span>
              </Label>
              <Input
                id="nextButton"
                value={data.customText.nextButton}
                onChange={(e) =>
                  onChange({
                    ...data,
                    customText: { ...data.customText, nextButton: e.target.value },
                  })
                }
                placeholder="Text for the next button on welcome/instructions pages"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Tree Navigation</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="taskProgress">
                  Task Progress Text
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {"{0}"} = current task, {"{1}"} = total tasks
                  </span>
                </Label>
                <Input
                  id="taskProgress"
                  value={data.customText.taskProgress}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, taskProgress: e.target.value },
                    })
                  }
                  placeholder="Task progress text (e.g., Task {0} of {1})"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skipTask">Skip Task Text</Label>
                <Input
                  id="skipTask"
                  value={data.customText.skipTask}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, skipTask: e.target.value },
                    })
                  }
                  placeholder="Text for skip task button"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTask">
                  Start Task Button
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Use {"{0}"} for task number
                  </span>
                </Label>
                <Input
                  id="startTask"
                  value={data.customText.startTask}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, startTask: e.target.value },
                    })
                  }
                  placeholder="Text for start task button (e.g., Start Task {0})"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="findItHere">Find It Here Button</Label>
                <Input
                  id="findItHere"
                  value={data.customText.findItHere}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, findItHere: e.target.value },
                    })
                  }
                  placeholder="Text for the 'I'd find it here' button"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selectAsAnswer">
                  Select Button
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    Shown on parent nodes when non-leaf answers are allowed
                  </span>
                </Label>
                <Input
                  id="selectAsAnswer"
                  value={data.customText.selectAsAnswer}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, selectAsAnswer: e.target.value },
                    })
                  }
                  placeholder="Text for the 'Select' button on parent nodes"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">
              Confidence Rating (7-Point Likert Scale)
            </Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="confidenceQuestion">Confidence Question</Label>
                <Input
                  id="confidenceQuestion"
                  value={data.customText.confidenceQuestion}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, confidenceQuestion: e.target.value },
                    })
                  }
                  placeholder="Question shown in confidence rating dialog"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confidenceDescription">Confidence Description</Label>
                <Input
                  id="confidenceDescription"
                  value={data.customText.confidenceDescription}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, confidenceDescription: e.target.value },
                    })
                  }
                  placeholder="Description text below confidence question"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stronglyDisagree">Strongly Disagree Label</Label>
                <Input
                  id="stronglyDisagree"
                  value={data.customText.stronglyDisagree}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, stronglyDisagree: e.target.value },
                    })
                  }
                  placeholder="Label for strongest disagreement option"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stronglyAgree">Strongly Agree Label</Label>
                <Input
                  id="stronglyAgree"
                  value={data.customText.stronglyAgree}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, stronglyAgree: e.target.value },
                    })
                  }
                  placeholder="Label for strongest agreement option"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="submitContinue">Submit and Continue Text</Label>
                <Input
                  id="submitContinue"
                  value={data.customText.submitContinue}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      customText: { ...data.customText, submitContinue: e.target.value },
                    })
                  }
                  placeholder="Text for submit and continue button"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
