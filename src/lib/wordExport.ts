import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType } from 'docx'

export interface EventData {
  eventName: string
  eventType: string
  description: string
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  location: string
  inviteMode: 'group' | 'radius' | 'individuals'
  inviteData: any
}

export interface ExportOptions {
  includeAssets?: boolean
  includeCredits?: boolean
  format?: 'docx' | 'pdf'
}

export class WordExporter {
  private eventData: EventData

  constructor(eventData: EventData) {
    this.eventData = eventData
  }

  async generateDocument(options: ExportOptions = {}): Promise<Blob> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: this.eventData.eventName,
                  bold: true,
                  size: 32,
                }),
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: {
                after: 400,
              },
            }),

            // Event Type
            new Paragraph({
              children: [
                new TextRun({
                  text: `Event Type: ${this.getEventTypeLabel()}`,
                  bold: true,
                  size: 24,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: {
                before: 200,
                after: 200,
              },
            }),

            // Description
            ...(this.eventData.description ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Description:",
                    bold: true,
                    size: 24,
                  }),
                ],
                heading: HeadingLevel.HEADING_1,
                spacing: {
                  before: 200,
                  after: 100,
                },
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: this.eventData.description,
                    size: 22,
                  }),
                ],
                spacing: {
                  after: 200,
                },
              })
            ] : []),

            // Date and Time
            new Paragraph({
              children: [
                new TextRun({
                  text: "Event Schedule:",
                  bold: true,
                  size: 24,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: {
                before: 200,
                after: 100,
              },
            }),

            // Date/Time Table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Start Date & Time",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${this.formatDate(this.eventData.startDate)} at ${this.eventData.startTime}`,
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "End Date & Time",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: `${this.formatDate(this.eventData.endDate)} at ${this.eventData.endTime}`,
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),

            new Paragraph({
              children: [],
              spacing: {
                after: 200,
              },
            }),

            // Location
            new Paragraph({
              children: [
                new TextRun({
                  text: "Location:",
                  bold: true,
                  size: 24,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: {
                before: 200,
                after: 100,
              },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: this.eventData.location,
                  size: 22,
                }),
              ],
              spacing: {
                after: 200,
              },
            }),

            // Invitation Details
            new Paragraph({
              children: [
                new TextRun({
                  text: "Invitation Details:",
                  bold: true,
                  size: 24,
                }),
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: {
                before: 200,
                after: 100,
              },
            }),

            // Invitation Table
            new Table({
              width: {
                size: 100,
                type: WidthType.PERCENTAGE,
              },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Invitation Mode",
                              bold: true,
                            }),
                          ],
                        }),
                      ],
                    }),
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: this.getInviteModeLabel(),
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                ...this.getInviteDetailsRows(),
              ],
            }),

            new Paragraph({
              children: [],
              spacing: {
                after: 400,
              },
            }),

            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: "Generated by Event Management System",
                  italics: true,
                  size: 18,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: {
                before: 400,
              },
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated on: ${new Date().toLocaleDateString()}`,
                  italics: true,
                  size: 16,
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        },
      ],
    })

    const buffer = await Packer.toBuffer(doc)
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
  }

  async exportToWord(filename?: string): Promise<void> {
    const blob = await this.generateDocument()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename || `${this.eventData.eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_event_spec.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async exportToZip(options: ExportOptions = {}): Promise<Blob> {
    // For ZIP export, we'll create multiple files
    const files: { name: string; content: string | Blob }[] = []

    // Main event specification document
    const eventDoc = await this.generateDocument(options)
    files.push({
      name: 'event_specification.docx',
      content: eventDoc,
    })

    // Assets list (if requested)
    if (options.includeAssets) {
      const assetsContent = this.generateAssetsList()
      files.push({
        name: 'assets_list.txt',
        content: assetsContent,
      })
    }

    // Credits (if requested)
    if (options.includeCredits) {
      const creditsContent = this.generateCreditsList()
      files.push({
        name: 'credits.txt',
        content: creditsContent,
      })
    }

    // Generate ZIP using JSZip (would need to install jszip package)
    // For now, we'll return the main document
    return eventDoc
  }

  private getEventTypeLabel(): string {
    const eventTypes: Record<string, string> = {
      conference: 'Conference',
      workshop: 'Workshop',
      networking: 'Networking Event',
      social: 'Social Event',
      meeting: 'Meeting',
      other: 'Other',
    }
    return eventTypes[this.eventData.eventType] || 'Other'
  }

  private getInviteModeLabel(): string {
    const modes: Record<string, string> = {
      group: 'Group Invitation',
      radius: 'Radius-based Invitation',
      individuals: 'Individual Invitation',
    }
    return modes[this.eventData.inviteMode] || 'Individual Invitation'
  }

  private getInviteDetailsRows(): TableRow[] {
    const rows: TableRow[] = []

    switch (this.eventData.inviteMode) {
      case 'group':
        rows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Selected Groups",
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${this.eventData.inviteData.selectedGroups?.length || 0} groups`,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Total Members",
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${this.eventData.inviteData.groupMembers || 0} people`,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        )
        break
      case 'radius':
        rows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Radius",
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${this.eventData.inviteData.radius || 10} ${this.eventData.inviteData.unit || 'miles'}`,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        )
        break
      case 'individuals':
        rows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Selected Contacts",
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${this.eventData.inviteData.contacts?.length || 0} people`,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
        )
        break
    }

    return rows
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  private generateAssetsList(): string {
    return `EVENT MANAGEMENT SYSTEM - ASSETS LIST
Generated on: ${new Date().toLocaleDateString()}

THIRD-PARTY ASSETS USED:

1. Lucide React Icons
   - Source: Lucide
   - License: ISC
   - Description: Beautiful & consistent icon toolkit made by the community
   - URL: https://lucide.dev/

2. Tailwind CSS
   - Source: Tailwind Labs
   - License: MIT
   - Description: A utility-first CSS framework for rapid UI development
   - URL: https://tailwindcss.com/

3. Next.js
   - Source: Vercel
   - License: MIT
   - Description: The React framework for production
   - URL: https://nextjs.org/

4. React
   - Source: Meta
   - License: MIT
   - Description: A JavaScript library for building user interfaces
   - URL: https://react.dev/

5. TypeScript
   - Source: Microsoft
   - License: Apache-2.0
   - Description: JavaScript with syntax for types
   - URL: https://www.typescriptlang.org/

6. Prisma
   - Source: Prisma
   - License: Apache-2.0
   - Description: Next-generation ORM for Node.js and TypeScript
   - URL: https://www.prisma.io/

7. Sonner
   - Source: Sonner
   - License: MIT
   - Description: Toast notifications for React
   - URL: https://sonner.emilkowal.ski/

8. React Dropzone
   - Source: React Dropzone
   - License: MIT
   - Description: Simple HTML5 drag-drop zone with React.js
   - URL: https://react-dropzone.js.org/

9. Apryse WebViewer
   - Source: Apryse
   - License: Commercial
   - Description: PDF viewing and annotation library
   - URL: https://www.apryse.com/products/webviewer

10. Firebase
    - Source: Google
    - License: Apache-2.0
    - Description: App development platform
    - URL: https://firebase.google.com/

11. OpenAI API
    - Source: OpenAI
    - License: Commercial
    - Description: AI language models for various tasks
    - URL: https://openai.com/api/

NOTE: All assets are used in accordance with their respective licenses.
For more information, please visit the individual project URLs listed above.
`
  }

  private generateCreditsList(): string {
    return `EVENT MANAGEMENT SYSTEM - CREDITS
Generated on: ${new Date().toLocaleDateString()}

CREDITS & CONTRIBUTORS:

1. Development Team
   - Role: Lead Developers
   - Contribution: Core application architecture, PDF processing, AI integration, and user interface design
   - Contact: dev@company.com

2. Design Team
   - Role: UI/UX Designers
   - Contribution: User experience design, visual design system, and accessibility implementation
   - Contact: design@company.com

3. AI Research Team
   - Role: AI Specialists
   - Contribution: Mathematical explanation algorithms, content analysis, and contextual AI features
   - Contact: ai@company.com

4. Open Source Community
   - Role: Contributors
   - Contribution: Various open source libraries and tools that power this application
   - Contact: See individual library credits

LICENSE INFORMATION:
- This application is proprietary software. All rights reserved.
- All third-party assets are used in accordance with their respective licenses.
- See individual asset listings for specific license details.

CONTACT & SUPPORT:
- Email: support@company.com
- Phone: +1 (555) 123-4567
- Address: 123 Tech Street, City, State

Built with ❤️ by the development team
`
  }
}

// Utility function for easy usage
export async function exportEventToWord(eventData: EventData, filename?: string): Promise<void> {
  const exporter = new WordExporter(eventData)
  await exporter.exportToWord(filename)
}

export async function exportEventToZip(eventData: EventData, options: ExportOptions = {}): Promise<Blob> {
  const exporter = new WordExporter(eventData)
  return await exporter.exportToZip(options)
}
