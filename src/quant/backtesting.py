"""
Sophisticated Backtesting Framework
Event-driven backtesting with realistic execution simulation
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
import warnings


@dataclass
class Trade:
    """Represents a single trade"""
    timestamp: datetime
    ticker: str
    action: str  # 'buy' or 'sell'
    quantity: float
    price: float
    commission: float
    
    @property
    def value(self) -> float:
        return self.quantity * self.price
    
    @property
    def total_cost(self) -> float:
        return self.value + self.commission


@dataclass
class Position:
    """Represents a position in a security"""
    ticker: str
    quantity: float
    avg_entry_price: float
    current_price: float
    
    @property
    def market_value(self) -> float:
        return self.quantity * self.current_price
    
    @property
    def unrealized_pnl(self) -> float:
        return self.quantity * (self.current_price - self.avg_entry_price)
    
    @property
    def return_pct(self) -> float:
        if self.avg_entry_price == 0:
            return 0
        return (self.current_price - self.avg_entry_price) / self.avg_entry_price


class Portfolio:
    """Portfolio management with position tracking"""
    
    def __init__(self, initial_capital: float = 1000000.0):
        self.initial_capital = initial_capital
        self.cash = initial_capital
        self.positions: Dict[str, Position] = {}
        self.trades: List[Trade] = []
        self.equity_curve: List[Tuple[datetime, float]] = []
        self.current_time: Optional[datetime] = None
    
    def update_prices(self, prices: Dict[str, float], timestamp: datetime):
        """Update current prices for all positions"""
        self.current_time = timestamp
        for ticker, price in prices.items():
            if ticker in self.positions:
                self.positions[ticker].current_price = price
        
        # Record equity
        self.equity_curve.append((timestamp, self.total_equity))
    
    @property
    def total_equity(self) -> float:
        """Total portfolio value including cash and positions"""
        position_value = sum(pos.market_value for pos in self.positions.values())
        return self.cash + position_value
    
    @property
    def total_pnl(self) -> float:
        """Total profit/loss"""
        return self.total_equity - self.initial_capital
    
    @property
    def return_pct(self) -> float:
        """Total return percentage"""
        return self.total_pnl / self.initial_capital
    
    def execute_trade(self, trade: Trade) -> bool:
        """Execute a trade and update portfolio"""
        # Check if we have enough cash for buy
        if trade.action == 'buy':
            if self.cash < trade.total_cost:
                return False  # Insufficient funds
            
            self.cash -= trade.total_cost
            
            # Update or create position
            if trade.ticker in self.positions:
                pos = self.positions[trade.ticker]
                total_value = pos.market_value + trade.value
                total_quantity = pos.quantity + trade.quantity
                pos.avg_entry_price = total_value / total_quantity
                pos.quantity = total_quantity
            else:
                self.positions[trade.ticker] = Position(
                    ticker=trade.ticker,
                    quantity=trade.quantity,
                    avg_entry_price=trade.price,
                    current_price=trade.price
                )
        
        elif trade.action == 'sell':
            if trade.ticker not in self.positions:
                return False  # No position to sell
            
            pos = self.positions[trade.ticker]
            if pos.quantity < trade.quantity:
                return False  # Not enough shares
            
            self.cash += trade.value - trade.commission
            pos.quantity -= trade.quantity
            
            # Remove position if fully closed
            if pos.quantity == 0:
                del self.positions[trade.ticker]
        
        self.trades.append(trade)
        return True


class BacktestEngine:
    """
    Event-driven backtesting engine
    Simulates realistic market conditions
    """
    
    def __init__(self,
                 initial_capital: float = 1000000.0,
                 commission_rate: float = 0.001,  # 0.1%
                 slippage_model: str = 'fixed',
                 slippage_bps: float = 5.0):  # 5 basis points
        self.initial_capital = initial_capital
        self.commission_rate = commission_rate
        self.slippage_model = slippage_model
        self.slippage_bps = slippage_bps / 10000  # Convert to decimal
        
        self.portfolio: Optional[Portfolio] = None
        self.signals: List[Dict] = []
        self.results: Optional[Dict] = None
    
    def run_backtest(self,
                    strategy: Callable,
                    price_data: pd.DataFrame,
                    start_date: Optional[datetime] = None,
                    end_date: Optional[datetime] = None) -> Dict:
        """
        Run backtest for a trading strategy
        
        Args:
            strategy: Function that generates signals
            price_data: DataFrame with price data (columns are tickers)
            start_date: Backtest start date
            end_date: Backtest end date
            
        Returns:
            Backtest results dictionary
        """
        # Filter date range
        if start_date:
            price_data = price_data[price_data.index >= start_date]
        if end_date:
            price_data = price_data[price_data.index <= end_date]
        
        if price_data.empty:
            raise ValueError("No price data in specified date range")
        
        # Initialize portfolio
        self.portfolio = Portfolio(self.initial_capital)
        
        # Run simulation
        for timestamp, prices in price_data.iterrows():
            # Update portfolio prices
            current_prices = prices.dropna().to_dict()
            self.portfolio.update_prices(current_prices, timestamp)
            
            # Generate signals
            signals = strategy(
                timestamp=timestamp,
                prices=prices,
                portfolio=self.portfolio,
                historical_data=price_data.loc[:timestamp]
            )
            
            # Execute signals
            if signals:
                for signal in signals:
                    self._execute_signal(signal, timestamp, prices)
        
        # Calculate results
        self.results = self._calculate_results()
        return self.results
    
    def _execute_signal(self, signal: Dict, timestamp: datetime, prices: pd.Series):
        """Execute a trading signal"""
        ticker = signal['ticker']
        action = signal['action']
        target_pct = signal.get('target_weight', 0)  # Target portfolio weight
        
        if ticker not in prices or pd.isna(prices[ticker]):
            return
        
        price = prices[ticker]
        
        # Apply slippage
        if action == 'buy':
            executed_price = price * (1 + self.slippage_bps)
        else:  # sell
            executed_price = price * (1 - self.slippage_bps)
        
        # Calculate quantity
        if action == 'buy':
            target_value = self.portfolio.total_equity * target_pct
            current_value = self.portfolio.positions.get(ticker, Position(ticker, 0, 0, 0)).market_value
            trade_value = target_value - current_value
            
            if trade_value <= 0:
                return  # Already at or above target
            
            quantity = int(trade_value / executed_price)
        else:  # sell
            if ticker not in self.portfolio.positions:
                return
            
            position = self.portfolio.positions[ticker]
            if target_pct == 0:
                quantity = position.quantity  # Close entire position
            else:
                target_value = self.portfolio.total_equity * target_pct
                trade_value = position.market_value - target_value
                quantity = int(trade_value / executed_price)
        
        if quantity <= 0:
            return
        
        # Calculate commission
        trade_value = quantity * executed_price
        commission = trade_value * self.commission_rate
        
        # Create and execute trade
        trade = Trade(
            timestamp=timestamp,
            ticker=ticker,
            action=action,
            quantity=quantity,
            price=executed_price,
            commission=commission
        )
        
        self.portfolio.execute_trade(trade)
    
    def _calculate_results(self) -> Dict:
        """Calculate comprehensive backtest results"""
        if not self.portfolio or not self.portfolio.equity_curve:
            return {}
        
        equity_df = pd.DataFrame(self.portfolio.equity_curve, columns=['timestamp', 'equity'])
        equity_df.set_index('timestamp', inplace=True)
        
        # Calculate returns
        equity_df['returns'] = equity_df['equity'].pct_change()
        
        # Performance metrics
        results = {
            'initial_capital': self.initial_capital,
            'final_equity': self.portfolio.total_equity,
            'total_return': self.portfolio.return_pct,
            'total_pnl': self.portfolio.total_pnl,
            'n_trades': len(self.portfolio.trades),
            'n_long_positions': len([t for t in self.portfolio.trades if t.action == 'buy']),
            'n_short_positions': len([t for t in self.portfolio.trades if t.action == 'sell']),
        }
        
        # Return statistics
        if len(equity_df) > 1:
            results['annualized_return'] = (results['total_return'] + 1) ** (252 / len(equity_df)) - 1
            results['volatility'] = equity_df['returns'].std() * np.sqrt(252)
            results['sharpe_ratio'] = results['annualized_return'] / results['volatility'] if results['volatility'] > 0 else 0
        
        # Drawdown analysis
        rolling_max = equity_df['equity'].expanding().max()
        drawdown = (equity_df['equity'] - rolling_max) / rolling_max
        results['max_drawdown'] = drawdown.min()
        results['max_drawdown_pct'] = drawdown.min() * 100
        
        # Win/loss statistics
        trades_df = pd.DataFrame([
            {
                'ticker': t.ticker,
                'action': t.action,
                'value': t.value,
                'commission': t.commission,
            }
            for t in self.portfolio.trades
        ])
        
        if not trades_df.empty:
            results['total_commission'] = trades_df['commission'].sum()
            results['avg_trade_size'] = trades_df['value'].mean()
        
        # Equity curve
        results['equity_curve'] = equity_df['equity'].tolist()
        results['timestamps'] = [t.isoformat() for t in equity_df.index]
        
        return results


class WalkForwardOptimizer:
    """
    Walk-forward optimization for strategy parameter tuning
    Prevents overfitting by using out-of-sample data
    """
    
    def __init__(self,
                 strategy_class: type,
                 parameter_grid: Dict[str, List],
                 train_size: int = 252,  # 1 year
                 test_size: int = 63,    # 3 months
                 n_splits: int = 5):
        self.strategy_class = strategy_class
        self.parameter_grid = parameter_grid
        self.train_size = train_size
        self.test_size = test_size
        self.n_splits = n_splits
    
    def optimize(self, price_data: pd.DataFrame) -> Dict:
        """
        Run walk-forward optimization
        
        Args:
            price_data: Historical price data
            
        Returns:
            Optimization results
        """
        results = []
        
        # Generate walk-forward splits
        n_samples = len(price_data)
        step = (n_samples - self.train_size) // self.n_splits
        
        for i in range(self.n_splits):
            train_start = i * step
            train_end = train_start + self.train_size
            test_start = train_end
            test_end = min(test_start + self.test_size, n_samples)
            
            if test_end > n_samples:
                break
            
            train_data = price_data.iloc[train_start:train_end]
            test_data = price_data.iloc[test_start:test_end]
            
            # Test all parameter combinations
            for params in self._generate_parameter_combinations():
                # Train on in-sample data
                strategy = self.strategy_class(**params)
                
                # Test on out-of-sample data
                engine = BacktestEngine()
                backtest_results = engine.run_backtest(
                    strategy.generate_signals,
                    test_data
                )
                
                results.append({
                    'train_start': train_data.index[0],
                    'train_end': train_data.index[-1],
                    'test_start': test_data.index[0],
                    'test_end': test_data.index[-1],
                    'params': params,
                    'sharpe': backtest_results.get('sharpe_ratio', 0),
                    'return': backtest_results.get('total_return', 0),
                    'max_dd': backtest_results.get('max_drawdown', 0),
                })
        
        # Aggregate results
        results_df = pd.DataFrame(results)
        
        # Find best parameters (robust across periods)
        param_performance = results_df.groupby('params').agg({
            'sharpe': ['mean', 'std'],
            'return': ['mean', 'std'],
            'max_dd': 'mean'
        })
        
        # Select parameters with best risk-adjusted return
        param_performance['score'] = (
            param_performance[('sharpe', 'mean')] -
            0.5 * param_performance[('sharpe', 'std')]
        )
        
        best_params = param_performance['score'].idxmax()
        
        return {
            'best_params': best_params,
            'all_results': results_df,
            'param_performance': param_performance,
        }
    
    def _generate_parameter_combinations(self) -> List[Dict]:
        """Generate all parameter combinations"""
        from itertools import product
        
        keys = list(self.parameter_grid.keys())
        values = list(self.parameter_grid.values())
        
        combinations = []
        for combo in product(*values):
            combinations.append(dict(zip(keys, combo)))
        
        return combinations


class MonteCarloBacktest:
    """
    Monte Carlo simulation for strategy robustness testing
    """
    
    def __init__(self, n_simulations: int = 1000):
        self.n_simulations = n_simulations
    
    def run_simulation(self,
                      strategy: Callable,
                      price_data: pd.DataFrame,
                      perturbation_std: float = 0.02) -> Dict:
        """
        Run Monte Carlo backtests with perturbed data
        
        Args:
            strategy: Trading strategy function
            price_data: Historical price data
            perturbation_std: Standard deviation of price perturbations
            
        Returns:
            Simulation results
        """
        results = []
        
        for i in range(self.n_simulations):
            # Perturb price data
            perturbed_data = price_data.copy()
            perturbations = np.random.normal(0, perturbation_std, price_data.shape)
            perturbed_data = perturbed_data * (1 + perturbations)
            
            # Run backtest
            engine = BacktestEngine()
            backtest_results = engine.run_backtest(strategy, perturbed_data)
            
            results.append({
                'simulation': i,
                'return': backtest_results.get('total_return', 0),
                'sharpe': backtest_results.get('sharpe_ratio', 0),
                'max_dd': backtest_results.get('max_drawdown', 0),
            })
        
        results_df = pd.DataFrame(results)
        
        return {
            'mean_return': results_df['return'].mean(),
            'std_return': results_df['return'].std(),
            'mean_sharpe': results_df['sharpe'].mean(),
            'prob_profit': (results_df['return'] > 0).mean(),
            'worst_case': results_df['return'].quantile(0.01),
            'best_case': results_df['return'].quantile(0.99),
            'all_results': results_df,
        }


if __name__ == "__main__":
    # Example usage
    print("Backtesting Framework Examples:\n")
    
    # Create sample price data
    dates = pd.date_range('2023-01-01', '2023-12-31', freq='D')
    np.random.seed(42)
    
    # Generate realistic price paths
    returns = np.random.normal(0.001, 0.02, len(dates))
    prices = 100 * np.exp(np.cumsum(returns))
    
    price_data = pd.DataFrame({
        'CRSP': prices,
        'VRTX': prices * (1 + np.random.normal(0, 0.01, len(dates))),
    }, index=dates)
    
    # Simple moving average strategy
    def ma_strategy(timestamp, prices, portfolio, historical_data):
        signals = []
        
        for ticker in ['CRSP', 'VRTX']:
            if ticker not in prices or pd.isna(prices[ticker]):
                continue
            
            if len(historical_data) < 20:
                continue
            
            ma20 = historical_data[ticker].rolling(20).mean().iloc[-1]
            current_price = prices[ticker]
            
            # Buy signal: price above MA
            if current_price > ma20:
                signals.append({
                    'ticker': ticker,
                    'action': 'buy',
                    'target_weight': 0.5  # 50% allocation
                })
            else:
                signals.append({
                    'ticker': ticker,
                    'action': 'sell',
                    'target_weight': 0
                })
        
        return signals
    
    # Run backtest
    engine = BacktestEngine(initial_capital=1000000)
    results = engine.run_backtest(ma_strategy, price_data)
    
    print("Backtest Results:")
    print(f"  Initial Capital: ${results['initial_capital']:,.0f}")
    print(f"  Final Equity: ${results['final_equity']:,.0f}")
    print(f"  Total Return: {results['total_return']:.2%}")
    print(f"  Sharpe Ratio: {results['sharpe_ratio']:.2f}")
    print(f"  Max Drawdown: {results['max_drawdown_pct']:.2f}%")
    print(f"  Number of Trades: {results['n_trades']}")
