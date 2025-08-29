import { defineKnowledgeLanguage } from '../../lms/src/lib/knowledge-dsl';

/**
 * This file defines the formal language (TBox) for describing any application
 * built with the Sota framework. This metamodel is the key to the
 * "Knowledge Compiler" which will generate Sota boilerplate from a
 * high-level knowledge graph.
 */
export const sotaMetamodel = defineKnowledgeLanguage((lang) => {
    // --- Structural Node Types ---
    const BoundedContext = lang.defineNodeType('BoundedContext');
    const Aggregate = lang.defineNodeType('Aggregate');
    const Entity = lang.defineNodeType('Entity');
    const ValueObject = lang.defineNodeType('ValueObject');
    const Event = lang.defineNodeType('Event');
    const DTO = lang.defineNodeType('DTO');

    // --- Behavioral Node Types ---
    const UseCase = lang.defineNodeType('UseCase');
    const Port = lang.defineNodeType('Port');
    const Adapter = lang.defineNodeType('Adapter');

    // --- Edge Types ---
    lang.defineEdgeType({ name: 'CONTEXT_CONTAINS_AGGREGATE', source: BoundedContext, target: Aggregate });
    lang.defineEdgeType({ name: 'AGGREGATE_CONTAINS_ENTITY', source: Aggregate, target: Entity });
    lang.defineEdgeType({ name: 'AGGREGATE_CONTAINS_VO', source: Aggregate, target: ValueObject });
    lang.defineEdgeType({ name: 'AGGREGATE_RAISES_EVENT', source: Aggregate, target: Event });
    lang.defineEdgeType({ name: 'USECASE_MANIPULATES_AGGREGATE', source: UseCase, target: Aggregate });
    lang.defineEdgeType({ name: 'USECASE_DEPENDS_ON_PORT', source: UseCase, target: Port });
    lang.defineEdgeType({ name: 'PORT_IMPLEMENTED_BY_ADAPTER', source: Port, target: Adapter });
    lang.defineEdgeType({ name: 'USECASE_USES_DTO', source: UseCase, target: DTO });
    lang.defineEdgeType({ name: 'PORT_USES_DTO', source: Port, target: DTO });
    lang.defineEdgeType({ name: 'ADAPTER_IMPLEMENTS_PORT', source: Adapter, target: Port });
});