'use client';

/**
 * WritingConfigEditor Component
 * Admin component for managing AI writing agent configuration
 *
 * Requirements: 9.1, 9.3, 9.4, 9.5, 9.6
 * - 9.1: Provide a Writing Config editor with tabs for Prompts, Style Guide, Skills, and Templates
 * - 9.3: Provide Monaco editors for baseSystemPrompt and per-role system prompts
 * - 9.4: Provide a Monaco editor for the styleGuide markdown document
 * - 9.5: Allow adding, editing, reordering, and deleting WritingSkill entries
 * - 9.6: Allow adding, editing, and deleting WritingTemplate entries
 */

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import type {
  WritingConfig,
  WritingSkill,
  WritingTemplate,
  AgentPersona,
} from '@/types/writing-config';
import { useTheme } from '@/components/ThemeProvider';

// Dynamically import Monaco editor with SSR disabled
const Editor = dynamic(() => import('@monaco-editor/react').then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[var(--color-background)]">
      <span className="text-sm text-[var(--color-foreground-muted)]">Loading editor...</span>
    </div>
  ),
});

interface WritingConfigEditorProps {
  config: WritingConfig;
  onSave: (config: Partial<WritingConfig>) => Promise<void>;
}

type TabId = 'prompts' | 'style-guide' | 'skills' | 'templates';

const tabs: { id: TabId; label: string }[] = [
  { id: 'prompts', label: 'Prompts' },
  { id: 'style-guide', label: 'Style Guide' },
  { id: 'skills', label: 'Skills' },
  { id: 'templates', label: 'Templates' },
];

function MonacoEditor({
  value,
  onChange,
  language = 'markdown',
  height = '300px',
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
}) {
  const { theme } = useTheme();
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div
      style={{ height }}
      className="border border-[var(--color-border)] rounded-md overflow-hidden"
    >
      <Editor
        height="100%"
        language={language}
        value={value}
        theme={monacoTheme}
        onChange={(v) => onChange(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          wordWrap: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  );
}

// Prompts Tab Component
function PromptsTab({
  baseSystemPrompt,
  agents,
  onBasePromptChange,
  onAgentChange,
}: {
  baseSystemPrompt: string;
  agents: AgentPersona[];
  onBasePromptChange: (value: string) => void;
  onAgentChange: (role: AgentPersona['role'], updates: Partial<AgentPersona>) => void;
}) {
  const roles: AgentPersona['role'][] = ['researcher', 'writer', 'reviewer'];

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
          Base System Prompt
        </label>
        <p className="text-xs text-[var(--color-foreground-muted)] mb-2">
          Default prompt used when no persona-specific prompt is defined
        </p>
        <MonacoEditor value={baseSystemPrompt} onChange={onBasePromptChange} height="200px" />
      </div>

      <div className="border-t border-[var(--color-border)] pt-6">
        <h4 className="text-sm font-medium text-[var(--color-foreground)] mb-4">Agent Personas</h4>
        <div className="space-y-4">
          {roles.map((role) => {
            const agent = agents.find((a) => a.role === role) || {
              role,
              systemPrompt: '',
              enabled: true,
            };
            return (
              <div key={role} className="p-4 bg-[var(--color-background-secondary)] rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-[var(--color-foreground)] capitalize">
                      {role}
                    </span>
                    <label className="flex items-center gap-2 text-xs text-[var(--color-foreground-muted)]">
                      <input
                        type="checkbox"
                        checked={agent.enabled}
                        onChange={(e) => onAgentChange(role, { enabled: e.target.checked })}
                        className="rounded border-[var(--color-border)]"
                      />
                      Enabled
                    </label>
                  </div>
                </div>
                <MonacoEditor
                  value={agent.systemPrompt}
                  onChange={(v) => onAgentChange(role, { systemPrompt: v })}
                  height="150px"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Style Guide Tab Component
function StyleGuideTab({
  styleGuide,
  onChange,
}: {
  styleGuide: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
        Style Guide
      </label>
      <p className="text-xs text-[var(--color-foreground-muted)] mb-2">
        Markdown document injected into AI writing context for consistent style
      </p>
      <MonacoEditor value={styleGuide} onChange={onChange} height="500px" />
    </div>
  );
}

// Skills Tab Component
function SkillsTab({
  skills,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
}: {
  skills: WritingSkill[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<WritingSkill>) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-[var(--color-foreground)]">Writing Skills</h4>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            Custom prompts that can be injected into AI context
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Skill
        </button>
      </div>

      {skills.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--color-foreground-muted)]">
          No skills defined yet. Click &quot;Add Skill&quot; to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {skills.map((skill, index) => (
            <div
              key={skill.id}
              className="border border-[var(--color-border)] rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center gap-2 p-3 bg-[var(--color-surface)] cursor-pointer hover:bg-[var(--color-surface-hover)]"
                onClick={() => setExpandedId(expandedId === skill.id ? null : skill.id)}
              >
                <svg
                  className={`w-4 h-4 text-[var(--color-foreground-muted)] transition-transform ${expandedId === skill.id ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="flex-1 text-sm font-medium text-[var(--color-foreground)]">
                  {skill.name || 'Untitled Skill'}
                </span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onReorder(skill.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(skill.id, 'down')}
                    disabled={index === skills.length - 1}
                    className="p-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(skill.id)}
                    className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {expandedId === skill.id && (
                <div className="p-4 border-t border-[var(--color-border)] space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={skill.name}
                        onChange={(e) => onUpdate(skill.id, { name: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={skill.description}
                        onChange={(e) => onUpdate(skill.id, { description: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1">
                      Prompt
                    </label>
                    <MonacoEditor
                      value={skill.prompt}
                      onChange={(v) => onUpdate(skill.id, { prompt: v })}
                      height="150px"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Templates Tab Component
function TemplatesTab({
  templates,
  onAdd,
  onUpdate,
  onDelete,
}: {
  templates: WritingTemplate[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<WritingTemplate>) => void;
  onDelete: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-medium text-[var(--color-foreground)]">Entry Templates</h4>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            Pre-defined templates for new entries
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="py-8 text-center text-sm text-[var(--color-foreground-muted)]">
          No templates defined yet. Click &quot;Add Template&quot; to create one.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border border-[var(--color-border)] rounded-lg overflow-hidden"
            >
              <div
                className="flex items-center gap-2 p-3 bg-[var(--color-surface)] cursor-pointer hover:bg-[var(--color-surface-hover)]"
                onClick={() => setExpandedId(expandedId === template.id ? null : template.id)}
              >
                <svg
                  className={`w-4 h-4 text-[var(--color-foreground-muted)] transition-transform ${expandedId === template.id ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="flex-1 text-sm font-medium text-[var(--color-foreground)]">
                  {template.name || 'Untitled Template'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(template.id);
                  }}
                  className="p-1 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              {expandedId === template.id && (
                <div className="p-4 border-t border-[var(--color-border)] space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={template.name}
                        onChange={(e) => onUpdate(template.id, { name: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={template.description}
                        onChange={(e) => onUpdate(template.id, { description: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1">
                      Template Body (MDX)
                    </label>
                    <MonacoEditor
                      value={template.body}
                      onChange={(v) => onUpdate(template.id, { body: v })}
                      language="mdx"
                      height="200px"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--color-foreground-muted)] mb-1">
                      Default Frontmatter (JSON)
                    </label>
                    <MonacoEditor
                      value={JSON.stringify(template.frontmatter || {}, null, 2)}
                      onChange={(v) => {
                        try {
                          const parsed = JSON.parse(v);
                          onUpdate(template.id, { frontmatter: parsed });
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      language="json"
                      height="150px"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Main WritingConfigEditor Component
export function WritingConfigEditor({ config, onSave }: WritingConfigEditorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('prompts');
  const [localConfig, setLocalConfig] = useState<WritingConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Reset local config when prop changes
  useEffect(() => {
    setLocalConfig(config);
    setHasChanges(false);
  }, [config]);

  const updateConfig = useCallback((updates: Partial<WritingConfig>) => {
    setLocalConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleBasePromptChange = useCallback(
    (value: string) => {
      updateConfig({ baseSystemPrompt: value });
    },
    [updateConfig]
  );

  const handleAgentChange = useCallback(
    (role: AgentPersona['role'], updates: Partial<AgentPersona>) => {
      setLocalConfig((prev) => {
        const existingIndex = prev.agents.findIndex((a) => a.role === role);
        const newAgents = [...prev.agents];
        if (existingIndex >= 0) {
          const existing = newAgents[existingIndex];
          if (existing) {
            newAgents[existingIndex] = { ...existing, ...updates };
          }
        } else {
          const newAgent: AgentPersona = {
            role,
            systemPrompt: updates.systemPrompt ?? '',
            enabled: updates.enabled ?? true,
          };
          newAgents.push(newAgent);
        }
        return { ...prev, agents: newAgents };
      });
      setHasChanges(true);
      setSaveSuccess(false);
    },
    []
  );

  const handleStyleGuideChange = useCallback(
    (value: string) => {
      updateConfig({ styleGuide: value });
    },
    [updateConfig]
  );

  // Skills handlers
  const handleAddSkill = useCallback(() => {
    const newSkill: WritingSkill = {
      id: `skill-${Date.now()}`,
      name: 'New Skill',
      description: '',
      prompt: '',
    };
    setLocalConfig((prev) => ({ ...prev, skills: [...prev.skills, newSkill] }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleUpdateSkill = useCallback((id: string, updates: Partial<WritingSkill>) => {
    setLocalConfig((prev) => ({
      ...prev,
      skills: prev.skills.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleDeleteSkill = useCallback((id: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s.id !== id),
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleReorderSkill = useCallback((id: string, direction: 'up' | 'down') => {
    setLocalConfig((prev) => {
      const index = prev.skills.findIndex((s) => s.id === id);
      if (index < 0) return prev;
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.skills.length) return prev;
      const newSkills = [...prev.skills];
      const currentSkill = newSkills[index];
      const swapSkill = newSkills[newIndex];
      if (currentSkill && swapSkill) {
        newSkills[index] = swapSkill;
        newSkills[newIndex] = currentSkill;
      }
      return { ...prev, skills: newSkills };
    });
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  // Templates handlers
  const handleAddTemplate = useCallback(() => {
    const newTemplate: WritingTemplate = {
      id: `template-${Date.now()}`,
      name: 'New Template',
      description: '',
      body: '',
      frontmatter: {},
    };
    setLocalConfig((prev) => ({ ...prev, templates: [...prev.templates, newTemplate] }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleUpdateTemplate = useCallback((id: string, updates: Partial<WritingTemplate>) => {
    setLocalConfig((prev) => ({
      ...prev,
      templates: prev.templates.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleDeleteTemplate = useCallback((id: string) => {
    setLocalConfig((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== id),
    }));
    setHasChanges(true);
    setSaveSuccess(false);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(localConfig);
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          Writing Configuration
        </h3>
        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-sm text-[var(--color-success)]">Saved successfully</span>
          )}
          {hasChanges && !saveSuccess && (
            <span className="text-sm text-[var(--color-warning)]">Unsaved changes</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-4 py-1.5 text-sm bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-md hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-4 p-3 bg-[var(--color-error-background)] border border-[var(--color-error)] rounded-md">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[var(--color-border)]">
        <nav className="flex px-4" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)] hover:border-[var(--color-border)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'prompts' && (
          <PromptsTab
            baseSystemPrompt={localConfig.baseSystemPrompt}
            agents={localConfig.agents}
            onBasePromptChange={handleBasePromptChange}
            onAgentChange={handleAgentChange}
          />
        )}
        {activeTab === 'style-guide' && (
          <StyleGuideTab styleGuide={localConfig.styleGuide} onChange={handleStyleGuideChange} />
        )}
        {activeTab === 'skills' && (
          <SkillsTab
            skills={localConfig.skills}
            onAdd={handleAddSkill}
            onUpdate={handleUpdateSkill}
            onDelete={handleDeleteSkill}
            onReorder={handleReorderSkill}
          />
        )}
        {activeTab === 'templates' && (
          <TemplatesTab
            templates={localConfig.templates}
            onAdd={handleAddTemplate}
            onUpdate={handleUpdateTemplate}
            onDelete={handleDeleteTemplate}
          />
        )}
      </div>
    </div>
  );
}
