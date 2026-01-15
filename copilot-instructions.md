# GitHub Copilot Instructions

## Repository Overview

This repository serves as a configuration hub for a trading system project, containing issue templates and workflow configurations for managing trading strategies, market data, and automated trading systems.

## Project Focus Areas

### Trading & Strategies
- Development and optimization of trading strategies
- Backtesting and performance analysis
- MQL5 Expert Advisor (EA) implementation
- Multi-timeframe analysis (M1 to W1)
- Various trading styles: Scalping, Day Trading, Swing Trading, Position Trading, Algorithmic Trading

### Markets & Instruments
- Forex (currency pairs like EURUSD, GBPUSD)
- Indices (DAX, UK100, US500)
- Commodities (XAUUSD, etc.)
- Cryptocurrencies
- Stocks, Futures, and Options

### Technical Components
- MetaTrader 5 (MT5) integration
- MQL5 programming
- Market data processing and validation
- API integrations
- Backtesting frameworks (QuantAnalyzer, MT5 Strategy Tester)

## Language & Conventions

### Primary Language
- **German**: All issue templates, documentation, and user-facing content are in German
- **English**: Code, technical comments, and variable names should use English
- Maintain consistency with existing templates when creating new content

### Issue Templates
The repository includes structured templates for:
- **Trading Strategy** (`trading_strategy.yml`): New strategies, optimizations, backtests
- **Task** (`task.yml`): Development tasks with structured planning
- **Feature Request** (`feature_request.yml`): New features and enhancements
- **Bug Report** (`bug_report.yml`): Bug tracking with severity levels
- **Data Issue** (`data_issue.yml`): Market data quality and processing issues
- **Integration Request** (`integration_request.yml`): API and system integrations
- **Config** (`config.yml`): Issue template configuration

### Template Structure Guidelines
When modifying or creating issue templates:
- Use YAML format (`.yml` extension)
- Include appropriate labels for categorization
- Provide dropdown options where applicable to standardize input
- Include validation for required fields
- Use checkboxes for Definition of Done and acceptance criteria
- Provide placeholder text in German to guide users

## Risk Management Standards

When working with trading-related code or strategies:
- Always consider stop-loss and take-profit parameters
- Document position sizing and risk percentage per trade
- Include maximum drawdown considerations
- Validate timeframe compatibility

## Data Quality Standards

For market data handling:
- Validate symbol specifications
- Ensure proper timestamp handling across timezones
- Check for data gaps or inconsistencies
- Document data sources (MT5, broker feeds, CSV imports, APIs)

## Testing & Validation

When implementing features:
- Follow the Definition of Done checklist in task templates
- Include unit tests, integration tests, and manual test plans
- Validate against acceptance criteria
- Ensure code review approval before merging
- Update documentation as needed

## Monitoring & Observability

For production changes:
- Configure appropriate alerts
- Implement logging for critical operations
- Update dashboards when adding new metrics
- Document monitoring requirements in tasks

## Best Practices

1. **Structured Planning**: Use the task template structure with clear goals, scope, acceptance criteria, and validation steps
2. **Categorization**: Apply appropriate labels and categories from existing templates
3. **Priority Awareness**: Consider priority levels (Critical, High, Medium, Low/Future)
4. **Automation Considerations**: Note whether features should be implemented as Expert Advisors or manual processes
5. **Bilingual Approach**: German for documentation and user interaction, English for code
6. **Market Sensitivity**: Be aware of time-sensitive nature of trading systems and data

## File Organization

- Issue templates in `ISSUE_TEMPLATE/` directory
- All templates use `.yml` format
- Configuration files follow GitHub standards
- Maintain existing directory structure
