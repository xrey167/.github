//! Generic filter DSL for DataForSEO endpoints that accept `filters[]`.
//!
//! Source: docs/DATAFORSEO_BACKLINKS_PHASE2.md Teil 3. The DSL is a recursive
//! tree: a leaf is a (field, operator, value) triple; a composite alternates
//! filter trees with logical "and" / "or" connectors. The on-the-wire shape
//! matches DataForSEO exactly so the visual filter-builder UI can build a
//! `Filter` value, hand it to the Rust backend, and have it serialised
//! correctly without further translation.
//!
//! Examples:
//!
//! - `[["dofollow", "=", true]]`
//! - `[["dofollow", "=", true], "and", [["anchor", "ilike", "%seo%"], "or",
//!    ["anchor", "ilike", "%marketing%"]]]`

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use ts_rs::TS;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(rename_all = "snake_case")]
pub enum Operator {
    Eq,
    Ne,
    Gt,
    Lt,
    Ge,
    Le,
    In,
    NotIn,
    Like,
    NotLike,
    Ilike,
    NotIlike,
    Match,
    NotMatch,
}

impl Operator {
    /// Serialised exactly as DataForSEO accepts.
    pub fn as_wire(self) -> &'static str {
        match self {
            Operator::Eq => "=",
            Operator::Ne => "<>",
            Operator::Gt => ">",
            Operator::Lt => "<",
            Operator::Ge => ">=",
            Operator::Le => "<=",
            Operator::In => "in",
            Operator::NotIn => "not_in",
            Operator::Like => "like",
            Operator::NotLike => "not_like",
            Operator::Ilike => "ilike",
            Operator::NotIlike => "not_ilike",
            Operator::Match => "match",
            Operator::NotMatch => "not_match",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(rename_all = "lowercase")]
pub enum Logical {
    And,
    Or,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../src/lib/types/")]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum Filter {
    /// Leaf condition: field operator value.
    Condition {
        field: String,
        operator: Operator,
        value: serde_json::Value,
    },
    /// Composite: alternating filter | logical | filter | logical | filter ...
    Group {
        /// Always 1, 3, 5, ... children.
        nodes: Vec<Filter>,
        /// Always nodes.len() - 1 connectors.
        connectors: Vec<Logical>,
    },
}

impl Filter {
    /// Convert to DataForSEO's wire format. Conditions become 3-element
    /// arrays; groups become 5+-element arrays alternating filter and
    /// connector strings.
    pub fn to_wire(&self) -> Value {
        match self {
            Filter::Condition { field, operator, value } => {
                json!([field, operator.as_wire(), value])
            }
            Filter::Group { nodes, connectors } => {
                if nodes.is_empty() {
                    return Value::Array(Vec::new());
                }
                if nodes.len() == 1 {
                    return nodes[0].to_wire();
                }
                let mut out = Vec::with_capacity(nodes.len() * 2 - 1);
                for (i, node) in nodes.iter().enumerate() {
                    out.push(node.to_wire());
                    // Always emit a connector between nodes — defaulting to
                    // And if `connectors` is shorter than `nodes.len() - 1`.
                    // Without this, a malformed Group with too few connectors
                    // would serialize as `[cond1, cond2]`, which DataForSEO
                    // rejects as invalid filter syntax.
                    if i < nodes.len() - 1 {
                        let conn = connectors.get(i).unwrap_or(&Logical::And);
                        out.push(json!(match conn {
                            Logical::And => "and",
                            Logical::Or => "or",
                        }));
                    }
                }
                Value::Array(out)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simple_condition_serializes_as_three_element_array() {
        let f = Filter::Condition {
            field: "dofollow".into(),
            operator: Operator::Eq,
            value: json!(true),
        };
        assert_eq!(f.to_wire(), json!(["dofollow", "=", true]));
    }

    #[test]
    fn negation_operators_use_underscores() {
        let f = Filter::Condition {
            field: "anchor".into(),
            operator: Operator::NotIlike,
            value: json!("%spam%"),
        };
        assert_eq!(f.to_wire(), json!(["anchor", "not_ilike", "%spam%"]));
    }

    #[test]
    fn and_group_alternates_conditions_and_connectors() {
        let f = Filter::Group {
            nodes: vec![
                Filter::Condition {
                    field: "dofollow".into(),
                    operator: Operator::Eq,
                    value: json!(true),
                },
                Filter::Condition {
                    field: "domain_from_rank".into(),
                    operator: Operator::Gt,
                    value: json!(30),
                },
            ],
            connectors: vec![Logical::And],
        };
        assert_eq!(
            f.to_wire(),
            json!([
                ["dofollow", "=", true],
                "and",
                ["domain_from_rank", ">", 30]
            ])
        );
    }

    #[test]
    fn nested_group_preserves_structure() {
        // (dofollow=true) AND ((anchor ilike "%seo%") OR (anchor ilike "%marketing%"))
        let f = Filter::Group {
            nodes: vec![
                Filter::Condition {
                    field: "dofollow".into(),
                    operator: Operator::Eq,
                    value: json!(true),
                },
                Filter::Group {
                    nodes: vec![
                        Filter::Condition {
                            field: "anchor".into(),
                            operator: Operator::Ilike,
                            value: json!("%seo%"),
                        },
                        Filter::Condition {
                            field: "anchor".into(),
                            operator: Operator::Ilike,
                            value: json!("%marketing%"),
                        },
                    ],
                    connectors: vec![Logical::Or],
                },
            ],
            connectors: vec![Logical::And],
        };
        assert_eq!(
            f.to_wire(),
            json!([
                ["dofollow", "=", true],
                "and",
                [
                    ["anchor", "ilike", "%seo%"],
                    "or",
                    ["anchor", "ilike", "%marketing%"]
                ]
            ])
        );
    }

    #[test]
    fn single_node_group_is_unwrapped() {
        let f = Filter::Group {
            nodes: vec![Filter::Condition {
                field: "is_lost".into(),
                operator: Operator::Eq,
                value: json!(false),
            }],
            connectors: vec![],
        };
        assert_eq!(f.to_wire(), json!(["is_lost", "=", false]));
    }

    #[test]
    fn empty_group_serializes_to_empty_array() {
        let f = Filter::Group { nodes: vec![], connectors: vec![] };
        assert_eq!(f.to_wire(), json!([]));
    }

    #[test]
    fn missing_connector_defaults_to_and() {
        // Malformed group with two nodes but no connectors. We default to
        // "and" so the wire form is still valid filter syntax instead of
        // `[cond1, cond2]` (which DataForSEO rejects).
        let f = Filter::Group {
            nodes: vec![
                Filter::Condition {
                    field: "dofollow".into(),
                    operator: Operator::Eq,
                    value: json!(true),
                },
                Filter::Condition {
                    field: "rank".into(),
                    operator: Operator::Gt,
                    value: json!(30),
                },
            ],
            connectors: vec![],
        };
        assert_eq!(
            f.to_wire(),
            json!([
                ["dofollow", "=", true],
                "and",
                ["rank", ">", 30]
            ])
        );
    }
}
