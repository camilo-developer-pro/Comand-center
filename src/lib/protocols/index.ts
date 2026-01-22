/**
 * Protocol Engine Module
 * Command Center V3.0 - Milestone 2.2
 * 
 * Exports all protocol-related types, schemas, and utilities.
 */

// Schema and types
export {
    PROTOCOL_SCHEMA,
    type ProtocolMetadata,
    type ScaffoldInput,
    type ContextSource,
    type ProtocolScaffold,
    type StepType,
    type LLMCallConfig,
    type ToolExecutionConfig,
    type ConditionalConfig,
    type ParallelConfig,
    type HumanReviewConfig,
    type WaitConfig,
    type StepConfig,
    type RetryConfig,
    type ProtocolStep,
    type SimpleTransition,
    type ComplexTransition,
    type ProtocolTransition,
    type ErrorHandling,
    type ProtocolDefinition,
    type ExecutionStatus,
    type ProtocolExecutionState,
    type TriggerType,
    type ProtocolExecution,
    type ProtocolType,
    type ProtocolRecord
} from './protocol-schema';

// Validation
export {
    validateProtocol,
    isValidProtocol,
    createMinimalProtocol,
    formatValidationErrors,
    type ValidationError,
    type ValidationResult
} from './protocol-validator';

// Bootstrap protocols
export {
    INGESTION_PROTOCOL,
    RESOLUTION_PROTOCOL,
    ERROR_HANDLING_PROTOCOL,
    BOOTSTRAP_PROTOCOLS,
    type BootstrapProtocolName
} from './bootstrap-protocols';

// Seeding utilities
export {
    seedBootstrapProtocols,
    verifyBootstrapProtocols,
    getBootstrapProtocol,
    type SeedResult
} from './seed-protocols';
