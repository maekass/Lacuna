# Contributing to Immunology Investment Intelligence Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

This project adheres to professional research ethics and open-source collaboration standards. By participating, you agree to maintain respectful, constructive communication.

## How to Contribute

### Reporting Issues

- Use the GitHub issue tracker
- Provide clear, reproducible steps
- Include system information (OS, Python version)
- Tag appropriately (bug, enhancement, documentation)

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Commit with clear messages (`git commit -m 'Add amazing feature'`)
7. Push to your fork (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards

- **Style**: Follow PEP 8 (use `black` for formatting)
- **Documentation**: Add docstrings for all functions/classes
- **Testing**: Include unit tests for new features
- **Type Hints**: Use type annotations where appropriate

### Areas for Contribution

- **Data Sources**: Integrate new clinical trial databases
- **ML Models**: Improve prediction accuracy
- **Visualizations**: Add new dashboard components
- **Documentation**: Improve guides and examples
- **Testing**: Expand test coverage

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Immunology-Investment-Intelligence.git
cd Immunology-Investment-Intelligence

# Create virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # If available

# Run tests
pytest tests/
```

## Questions?

Open an issue or reach out to the maintainers.

---

**Thank you for contributing to open-source healthcare research!**
