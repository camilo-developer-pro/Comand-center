-- File: database/migrations/phase3/003_seed_meta_agent_protocol.sql
-- Phase 3: Seed Meta-Agent Protocol

-- Import the Meta-Agent protocol definition from TypeScript
-- Note: This SQL is generated from src/lib/protocols/meta-agent-protocol.ts
-- Update this file when the TypeScript definition changes

-- Insert into agent_runtime.protocols (from protocol_engine_schema migration)
INSERT INTO agent_runtime.protocols (
    id,
    workspace_id,
    name,
    version,
    description,
    protocol_type,
    definition,
    is_system
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::UUID,
    (SELECT id FROM public.workspaces LIMIT 1),  -- Use first workspace as default
    'Meta-Agent Error Handler',
    '1.0.0',
    'The self-correcting agent that diagnoses errors and patches protocols autonomously',
    'error_handling',
    $protocol_def${
  "metadata": {
    "name": "meta_agent_error_handler",
    "version": "1.0.0",
    "intent": "Diagnose protocol failures and generate self-correcting patches",
    "tags": ["system", "meta", "self-repair", "autonomous"],
    "author": "system",
    "requires_approval": false
  },
  "scaffold": {
    "inputs": [
      {"name": "error_id", "type": "string", "required": true},
      {"name": "error_class", "type": "string", "required": true},
      {"name": "protocol_id", "type": "string", "required": true},
      {"name": "step_id", "type": "string", "required": true}
    ],
    "context_sources": [
      {
        "source_type": "database",
        "query": "\n                        SELECT e.*, p.definition as protocol_definition\n                        FROM episodic_memory.error_logs e\n                        JOIN procedural_memory.protocols p ON p.id = e.protocol_id\n                        WHERE e.id = '{{inputs.error_id}}'::UUID\n                    ",
        "output_key": "error_details"
      },
      {
        "source_type": "database",
        "query": "\n                        SELECT * FROM episodic_memory.error_patterns\n                        WHERE fingerprint = (\n                            SELECT fingerprint FROM episodic_memory.error_logs\n                            WHERE id = '{{inputs.error_id}}'::UUID\n                        )\n                    ",
        "output_key": "historical_patterns"
      },
      {
        "source_type": "database",
        "query": "\n                        SELECT protocol_id, patch_version, diagnosis\n                        FROM episodic_memory.error_logs\n                        WHERE protocol_id = '{{inputs.protocol_id}}'::UUID\n                          AND patched_at IS NOT NULL\n                        ORDER BY patched_at DESC\n                        LIMIT 5\n                    ",
        "output_key": "recent_patches"
      }
    ]
  },
  "steps": [
    {
      "id": "check_recursion_guard",
      "type": "conditional",
      "config": {
        "conditions": [
          {
            "expression": "{{context.error_details.protocol_id}} === \"meta_agent_error_handler\"",
            "result": {"next_step": "escalate_to_human"}
          },
          {
            "expression": "{{context.historical_patterns.patched_count}} >= 3",
            "result": {"next_step": "escalate_to_human"}
          }
        ],
        "default_result": {"next_step": "run_database_diagnosis"}
      }
    },
    {
      "id": "run_database_diagnosis",
      "type": "tool_execution",
      "config": {
        "tool_name": "supabase_rpc",
        "tool_params": {
          "function_name": "episodic_memory.diagnose_error",
          "params": {"p_error_id": "{{inputs.error_id}}"}
        }
      },
      "timeout_seconds": 10
    },
    {
      "id": "evaluate_diagnosis",
      "type": "conditional",
      "config": {
        "conditions": [
          {
            "expression": "{{step_outputs.run_database_diagnosis.requires_human_review}} === true",
            "result": {"next_step": "escalate_to_human"}
          },
          {
            "expression": "{{step_outputs.run_database_diagnosis.confidence}} < 0.7",
            "result": {"next_step": "llm_enhanced_diagnosis"}
          }
        ],
        "default_result": {"next_step": "generate_patch"}
      }
    },
    {
      "id": "llm_enhanced_diagnosis",
      "type": "llm_call",
      "config": {
        "model": "claude-sonnet-4-20250514",
        "temperature": 0.2,
        "max_tokens": 2000,
        "system_prompt": "You are the Meta-Agent diagnostic specialist for Command Center V3.0.\n\nYour task is to analyze protocol execution errors and generate precise patches.\n\nCONTEXT:\n- Error Class: {{inputs.error_class}}\n- Step ID: {{inputs.step_id}}\n- Database Diagnosis: {{step_outputs.run_database_diagnosis | json}}\n- Protocol Definition: {{context.error_details.protocol_definition | json}}\n- Historical Patterns: {{context.historical_patterns | json}}\n\nOUTPUT FORMAT (strict JSON):\n{\n    \"enhanced_hypothesis\": \"string - detailed root cause analysis\",\n    \"patch_action\": \"UPDATE_PROTOCOL_SCHEMA | UPDATE_PROMPT_TEMPLATE | ADD_TRANSITION | INCREASE_TIMEOUT | ADD_FALLBACK_SOURCE | ADD_RETRY_CONFIG\",\n    \"patch_path\": \"string - JSON path in protocol definition (e.g., 'steps.step_id.config.timeout_ms')\",\n    \"patch_value\": any - the new value to set,\n    \"confidence\": number - 0.0 to 1.0,\n    \"reasoning\": \"string - explanation for the patch\"\n}",
        "user_prompt_template": "Analyze this error and generate a patch:\n\nError Message: {{context.error_details.error_message}}\nStep Input: {{context.error_details.step_input | json}}\nStep Output: {{context.error_details.step_output | json}}\nExpected Schema: {{context.error_details.expected_schema | json}}\nActual Output: {{context.error_details.actual_output | json}}\n\nGenerate the most precise patch to fix this error.",
        "output_schema": {
          "type": "object",
          "required": ["patch_action", "patch_path", "patch_value", "confidence"],
          "properties": {
            "enhanced_hypothesis": {"type": "string"},
            "patch_action": {"type": "string"},
            "patch_path": {"type": "string"},
            "patch_value": {},
            "confidence": {"type": "number"},
            "reasoning": {"type": "string"}
          }
        }
      }
    },
    {
      "id": "generate_patch",
      "type": "tool_execution",
      "config": {
        "tool_name": "protocol_patch_generator",
        "tool_params": {
          "protocol_id": "{{inputs.protocol_id}}",
          "diagnosis": "{{step_outputs.run_database_diagnosis}}",
          "llm_enhancement": "{{step_outputs.llm_enhanced_diagnosis}}"
        }
      }
    },
    {
      "id": "validate_patch",
      "type": "tool_execution",
      "config": {
        "tool_name": "protocol_schema_validator",
        "tool_params": {
          "patched_protocol": "{{step_outputs.generate_patch.patched_protocol}}"
        }
      }
    },
    {
      "id": "check_validation",
      "type": "conditional",
      "config": {
        "conditions": [
          {
            "expression": "{{step_outputs.validate_patch.valid}} === false",
            "result": {"next_step": "escalate_to_human"}
          }
        ],
        "default_result": {"next_step": "commit_patch"}
      }
    },
    {
      "id": "commit_patch",
      "type": "tool_execution",
      "config": {
        "tool_name": "protocol_version_committer",
        "tool_params": {
          "protocol_id": "{{inputs.protocol_id}}",
          "new_definition": "{{step_outputs.generate_patch.patched_protocol}}",
          "patch_reason": "{{step_outputs.run_database_diagnosis.hypothesis}}",
          "error_id": "{{inputs.error_id}}"
        }
      }
    },
    {
      "id": "log_success",
      "type": "tool_execution",
      "config": {
        "tool_name": "supabase_rpc",
        "tool_params": {
          "function_name": "episodic_memory.log_event",
          "params": {
            "category": "AGENT_ACTION",
            "event_type": "META_AGENT_PATCH_COMMITTED",
            "summary": "Protocol {{inputs.protocol_id}} patched successfully",
            "details": {
              "error_id": "{{inputs.error_id}}",
              "patch_version": "{{step_outputs.commit_patch.new_version}}"
            }
          }
        }
      }
    },
    {
      "id": "escalate_to_human",
      "type": "tool_execution",
      "config": {
        "tool_name": "create_review_task",
        "tool_params": {
          "task_type": "PROTOCOL_ERROR_REVIEW",
          "priority": "high",
          "context": {
            "error_id": "{{inputs.error_id}}",
            "protocol_id": "{{inputs.protocol_id}}",
            "diagnosis": "{{step_outputs.run_database_diagnosis}}",
            "reason": "Meta-Agent could not auto-resolve this error"
          }
        }
      }
    }
  ],
  "transitions": {
    "check_recursion_guard": {
      "on_success": "run_database_diagnosis"
    },
    "run_database_diagnosis": {
      "on_success": "evaluate_diagnosis",
      "on_failure": "escalate_to_human"
    },
    "evaluate_diagnosis": {
      "on_success": "generate_patch"
    },
    "llm_enhanced_diagnosis": {
      "on_success": "generate_patch",
      "on_failure": "escalate_to_human"
    },
    "generate_patch": {
      "on_success": "validate_patch",
      "on_failure": "escalate_to_human"
    },
    "validate_patch": {
      "on_success": "check_validation"
    },
    "check_validation": {
      "on_success": "commit_patch"
    },
    "commit_patch": {
      "on_success": "log_success",
      "on_failure": "escalate_to_human"
    },
    "log_success": {
      "on_success": "END"
    },
    "escalate_to_human": {
      "on_success": "END"
    }
  },
  "error_handling": {
    "global_fallback": "escalate_to_human",
    "retry_policy": {
      "max_retries": 1
    }
  }
}$protocol_def$::JSONB,
    TRUE
)
ON CONFLICT (workspace_id, name, version) DO UPDATE SET
    definition = EXCLUDED.definition,
    description = EXCLUDED.description;