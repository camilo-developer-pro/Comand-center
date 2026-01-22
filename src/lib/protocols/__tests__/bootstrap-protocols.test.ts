/**
 * Bootstrap Protocol Validation Tests
 * Command Center V3.0 - Verifies all bootstrap protocols pass validation
 */

import { describe, it, expect } from 'vitest';
import {
    INGESTION_PROTOCOL,
    RESOLUTION_PROTOCOL,
    ERROR_HANDLING_PROTOCOL,
    BOOTSTRAP_PROTOCOLS
} from '../bootstrap-protocols';
import { validateProtocol } from '../protocol-validator';

describe('Bootstrap Protocols', () => {
    describe('IngestionProtocol', () => {
        it('should pass JSON Schema validation', () => {
            const result = validateProtocol(INGESTION_PROTOCOL);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should have correct metadata', () => {
            expect(INGESTION_PROTOCOL.metadata.name).toBe('IngestionProtocol');
            expect(INGESTION_PROTOCOL.metadata.version).toBe('1.0.0');
            expect(INGESTION_PROTOCOL.metadata.tags).toContain('system');
        });

        it('should have required inputs', () => {
            const inputNames = INGESTION_PROTOCOL.scaffold.inputs.map(i => i.name);
            expect(inputNames).toContain('document_id');
            expect(inputNames).toContain('document_content');
        });

        it('should have 7 steps', () => {
            expect(INGESTION_PROTOCOL.steps).toHaveLength(7);
        });
    });

    describe('ResolutionProtocol', () => {
        it('should pass JSON Schema validation', () => {
            const result = validateProtocol(RESOLUTION_PROTOCOL);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should have correct metadata', () => {
            expect(RESOLUTION_PROTOCOL.metadata.name).toBe('ResolutionProtocol');
            expect(RESOLUTION_PROTOCOL.metadata.version).toBe('1.0.0');
            expect(RESOLUTION_PROTOCOL.metadata.tags).toContain('reasoning');
        });

        it('should have user_query as required input', () => {
            const userQueryInput = RESOLUTION_PROTOCOL.scaffold.inputs.find(
                i => i.name === 'user_query'
            );
            expect(userQueryInput).toBeDefined();
            expect(userQueryInput?.required).toBe(true);
        });

        it('should have 5 steps', () => {
            expect(RESOLUTION_PROTOCOL.steps).toHaveLength(5);
        });
    });

    describe('ErrorHandlingProtocol', () => {
        it('should pass JSON Schema validation', () => {
            const result = validateProtocol(ERROR_HANDLING_PROTOCOL);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should have correct metadata', () => {
            expect(ERROR_HANDLING_PROTOCOL.metadata.name).toBe('ErrorHandlingProtocol');
            expect(ERROR_HANDLING_PROTOCOL.metadata.version).toBe('1.0.0');
            expect(ERROR_HANDLING_PROTOCOL.metadata.tags).toContain('error');
        });

        it('should have error-related inputs', () => {
            const inputNames = ERROR_HANDLING_PROTOCOL.scaffold.inputs.map(i => i.name);
            expect(inputNames).toContain('error_type');
            expect(inputNames).toContain('error_message');
            expect(inputNames).toContain('failed_step');
        });

        it('should have 5 steps', () => {
            expect(ERROR_HANDLING_PROTOCOL.steps).toHaveLength(5);
        });
    });

    describe('All Bootstrap Protocols', () => {
        it('should export exactly 3 protocols', () => {
            expect(BOOTSTRAP_PROTOCOLS).toHaveLength(3);
        });

        it('should all pass validation', () => {
            for (const protocol of BOOTSTRAP_PROTOCOLS) {
                const result = validateProtocol(protocol);
                expect(result.valid).toBe(true);
            }
        });

        it('should all be marked as system protocols (no approval required)', () => {
            for (const protocol of BOOTSTRAP_PROTOCOLS) {
                expect(protocol.metadata.requires_approval).toBe(false);
            }
        });
    });
});
