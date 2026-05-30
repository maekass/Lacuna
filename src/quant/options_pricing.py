"""
Sophisticated Options Pricing Models
Black-Scholes, Binomial, and Monte Carlo methods for biotech options
"""

import numpy as np
from scipy import stats
from scipy.optimize import brentq
from typing import Dict, Tuple, Optional, Callable
import warnings


class BlackScholesModel:
    """
    Black-Scholes option pricing model
    Includes Greeks calculations for risk management
    """
    
    @staticmethod
    def d1(S: float, K: float, T: float, r: float, sigma: float) -> float:
        """Calculate d1 parameter"""
        return (np.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
    
    @staticmethod
    def d2(S: float, K: float, T: float, r: float, sigma: float) -> float:
        """Calculate d2 parameter"""
        return BlackScholesModel.d1(S, K, T, r, sigma) - sigma * np.sqrt(T)
    
    @classmethod
    def call_price(cls, S: float, K: float, T: float, r: float, sigma: float) -> float:
        """
        Calculate European call option price
        
        Args:
            S: Current stock price
            K: Strike price
            T: Time to maturity (years)
            r: Risk-free rate
            sigma: Volatility
            
        Returns:
            Call option price
        """
        if T <= 0:
            return max(S - K, 0)
        
        d1 = cls.d1(S, K, T, r, sigma)
        d2 = cls.d2(S, K, T, r, sigma)
        
        return S * stats.norm.cdf(d1) - K * np.exp(-r * T) * stats.norm.cdf(d2)
    
    @classmethod
    def put_price(cls, S: float, K: float, T: float, r: float, sigma: float) -> float:
        """
        Calculate European put option price
        
        Args:
            S: Current stock price
            K: Strike price
            T: Time to maturity (years)
            r: Risk-free rate
            sigma: Volatility
            
        Returns:
            Put option price
        """
        if T <= 0:
            return max(K - S, 0)
        
        d1 = cls.d1(S, K, T, r, sigma)
        d2 = cls.d2(S, K, T, r, sigma)
        
        return K * np.exp(-r * T) * stats.norm.cdf(-d2) - S * stats.norm.cdf(-d1)
    
    @classmethod
    def call_greeks(cls, S: float, K: float, T: float, r: float, sigma: float) -> Dict:
        """
        Calculate option Greeks for calls
        
        Returns:
            Dictionary of Greeks: delta, gamma, theta, vega, rho
        """
        # Minimum threshold to prevent division by zero and numerical instability
        T_effective = max(T, 1e-6)
        
        if T <= 0:
            return {'delta': 1.0 if S > K else 0.0, 'gamma': 0, 'theta': 0, 'vega': 0, 'rho': 0}
        
        d1 = cls.d1(S, K, T_effective, r, sigma)
        d2 = cls.d2(S, K, T_effective, r, sigma)
        
        # Delta
        delta = stats.norm.cdf(d1)
        
        # Gamma (same for calls and puts)
        gamma = stats.norm.pdf(d1) / (S * sigma * np.sqrt(T_effective))
        
        # Theta
        theta = -(S * stats.norm.pdf(d1) * sigma) / (2 * np.sqrt(T_effective)) \
                - r * K * np.exp(-r * T_effective) * stats.norm.cdf(d2)
        theta = theta / 365  # Daily theta
        
        # Vega (same for calls and puts)
        vega = S * stats.norm.pdf(d1) * np.sqrt(T_effective) / 100  # Per 1% change
        
        # Rho
        rho = K * T_effective * np.exp(-r * T_effective) * stats.norm.cdf(d2) / 100  # Per 1% rate change
        
        return {
            'delta': delta,
            'gamma': gamma,
            'theta': theta,
            'vega': vega,
            'rho': rho
        }
    
    @classmethod
    def implied_volatility(cls, 
                          option_price: float,
                          S: float,
                          K: float,
                          T: float,
                          r: float,
                          option_type: str = 'call',
                          precision: float = 1e-5) -> Optional[float]:
        """
        Calculate implied volatility using Brent's method
        
        Args:
            option_price: Observed option price
            S: Current stock price
            K: Strike price
            T: Time to maturity
            r: Risk-free rate
            option_type: 'call' or 'put'
            precision: Convergence precision
            
        Returns:
            Implied volatility or None if cannot calculate
        """
        if T <= 0 or option_price <= 0:
            return None
        
        # Intrinsic value bounds
        if option_type == 'call':
            intrinsic = max(S - K, 0)
            max_price = S
        else:
            intrinsic = max(K - S, 0)
            max_price = K
        
        if option_price < intrinsic or option_price > max_price:
            return None
        
        # Define objective function
        def objective(sigma):
            if option_type == 'call':
                return cls.call_price(S, K, T, r, sigma) - option_price
            else:
                return cls.put_price(S, K, T, r, sigma) - option_price
        
        try:
            # Brent's method for finding root
            iv = brentq(objective, 0.001, 5.0, xtol=precision)
            return iv
        except ValueError:
            return None


class BinomialModel:
    """
    Cox-Ross-Rubinstein binomial option pricing model
    Handles American and European options
    """
    
    def __init__(self, n_steps: int = 100):
        self.n_steps = n_steps
    
    def price_option(self,
                    S: float,
                    K: float,
                    T: float,
                    r: float,
                    sigma: float,
                    option_type: str = 'call',
                    american: bool = True) -> float:
        """
        Price option using binomial tree
        
        Args:
            S: Current stock price
            K: Strike price
            T: Time to maturity (years)
            r: Risk-free rate
            sigma: Volatility
            option_type: 'call' or 'put'
            american: True for American option, False for European
            
        Returns:
            Option price
        """
        dt = T / self.n_steps
        u = np.exp(sigma * np.sqrt(dt))  # Up factor
        d = 1 / u  # Down factor
        p = (np.exp(r * dt) - d) / (u - d)  # Risk-neutral probability
        
        # Initialize stock price tree
        stock_tree = np.zeros((self.n_steps + 1, self.n_steps + 1))
        stock_tree[0, 0] = S
        
        for i in range(1, self.n_steps + 1):
            for j in range(i + 1):
                stock_tree[j, i] = S * (u ** (i - j)) * (d ** j)
        
        # Initialize option value tree
        option_tree = np.zeros((self.n_steps + 1, self.n_steps + 1))
        
        # Terminal payoffs
        for j in range(self.n_steps + 1):
            if option_type == 'call':
                option_tree[j, self.n_steps] = max(stock_tree[j, self.n_steps] - K, 0)
            else:
                option_tree[j, self.n_steps] = max(K - stock_tree[j, self.n_steps], 0)
        
        # Backward induction
        for i in range(self.n_steps - 1, -1, -1):
            for j in range(i + 1):
                # Expected value at next step
                continuation_value = np.exp(-r * dt) * (
                    p * option_tree[j, i + 1] + 
                    (1 - p) * option_tree[j + 1, i + 1]
                )
                
                if american:
                    # Early exercise value
                    if option_type == 'call':
                        exercise_value = max(stock_tree[j, i] - K, 0)
                    else:
                        exercise_value = max(K - stock_tree[j, i], 0)
                    
                    option_tree[j, i] = max(continuation_value, exercise_value)
                else:
                    option_tree[j, i] = continuation_value
        
        return option_tree[0, 0]


class MonteCarloOptionPricing:
    """
    Monte Carlo simulation for option pricing
    Handles exotic options and path-dependent payoffs
    """
    
    def __init__(self, n_simulations: int = 100000, n_steps: int = 252):
        self.n_simulations = n_simulations
        self.n_steps = n_steps
    
    def price_european(self,
                      S: float,
                      K: float,
                      T: float,
                      r: float,
                      sigma: float,
                      option_type: str = 'call') -> Tuple[float, float]:
        """
        Price European option using Monte Carlo
        
        Returns:
            Tuple of (price, standard_error)
        """
        dt = T / self.n_steps
        
        # Simulate paths
        paths = np.zeros((self.n_simulations, self.n_steps + 1))
        paths[:, 0] = S
        
        for t in range(1, self.n_steps + 1):
            z = np.random.standard_normal(self.n_simulations)
            paths[:, t] = paths[:, t-1] * np.exp(
                (r - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * z
            )
        
        # Calculate payoffs
        if option_type == 'call':
            payoffs = np.maximum(paths[:, -1] - K, 0)
        else:
            payoffs = np.maximum(K - paths[:, -1], 0)
        
        # Discount to present
        discounted_payoffs = np.exp(-r * T) * payoffs
        
        price = np.mean(discounted_payoffs)
        std_error = np.std(discounted_payoffs) / np.sqrt(self.n_simulations)
        
        return price, std_error
    
    def price_asian(self,
                   S: float,
                   K: float,
                   T: float,
                   r: float,
                   sigma: float,
                   option_type: str = 'call',
                   averaging_method: str = 'arithmetic') -> Tuple[float, float]:
        """
        Price Asian option (path-dependent) using Monte Carlo
        
        Args:
            averaging_method: 'arithmetic' or 'geometric'
            
        Returns:
            Tuple of (price, standard_error)
        """
        dt = T / self.n_steps
        
        # Simulate paths
        paths = np.zeros((self.n_simulations, self.n_steps + 1))
        paths[:, 0] = S
        
        for t in range(1, self.n_steps + 1):
            z = np.random.standard_normal(self.n_simulations)
            paths[:, t] = paths[:, t-1] * np.exp(
                (r - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * z
            )
        
        # Calculate average prices
        if averaging_method == 'arithmetic':
            avg_prices = np.mean(paths[:, 1:], axis=1)
        else:  # geometric
            log_paths = np.log(paths[:, 1:])
            avg_prices = np.exp(np.mean(log_paths, axis=1))
        
        # Calculate payoffs
        if option_type == 'call':
            payoffs = np.maximum(avg_prices - K, 0)
        else:
            payoffs = np.maximum(K - avg_prices, 0)
        
        # Discount to present
        discounted_payoffs = np.exp(-r * T) * payoffs
        
        price = np.mean(discounted_payoffs)
        std_error = np.std(discounted_payoffs) / np.sqrt(self.n_simulations)
        
        return price, std_error
    
    def price_barrier(self,
                     S: float,
                     K: float,
                     T: float,
                     r: float,
                     sigma: float,
                     barrier: float,
                     option_type: str = 'call',
                     barrier_type: str = 'up-and-out') -> Tuple[float, float]:
        """
        Price barrier option using Monte Carlo
        
        Args:
            barrier_type: 'up-and-out', 'up-and-in', 'down-and-out', 'down-and-in'
            
        Returns:
            Tuple of (price, standard_error)
        """
        dt = T / self.n_steps
        
        # Simulate paths
        paths = np.zeros((self.n_simulations, self.n_steps + 1))
        paths[:, 0] = S
        
        for t in range(1, self.n_steps + 1):
            z = np.random.standard_normal(self.n_simulations)
            paths[:, t] = paths[:, t-1] * np.exp(
                (r - 0.5 * sigma**2) * dt + sigma * np.sqrt(dt) * z
            )
        
        # Check barrier conditions
        if 'up' in barrier_type:
            barrier_hit = np.any(paths > barrier, axis=1)
        else:  # down
            barrier_hit = np.any(paths < barrier, axis=1)
        
        # Calculate payoffs based on barrier type
        if 'out' in barrier_type:
            # Option knocks out if barrier hit
            payoffs = np.where(
                barrier_hit, 0,
                np.maximum(paths[:, -1] - K, 0) if option_type == 'call' 
                else np.maximum(K - paths[:, -1], 0)
            )
        else:  # 'in'
            # Option only pays if barrier hit
            payoffs = np.where(
                barrier_hit,
                np.maximum(paths[:, -1] - K, 0) if option_type == 'call'
                else np.maximum(K - paths[:, -1], 0),
                0
            )
        
        # Discount to present
        discounted_payoffs = np.exp(-r * T) * payoffs
        
        price = np.mean(discounted_payoffs)
        std_error = np.std(discounted_payoffs) / np.sqrt(self.n_simulations)
        
        return price, std_error


class VolatilitySurface:
    """
    Volatility surface modeling for biotech stocks
    Captures volatility smile/skew
    """
    
    def __init__(self, strikes: np.ndarray, maturities: np.ndarray):
        self.strikes = strikes
        self.maturities = maturities
        self.surface = None
    
    def fit_from_market_data(self, 
                            implied_vols: np.ndarray,
                            spot_price: float):
        """
        Fit volatility surface from market implied volatilities
        
        Args:
            implied_vols: 2D array of implied volatilities (strikes x maturities)
            spot_price: Current spot price
        """
        # Simple interpolation (in production, use more sophisticated methods)
        from scipy.interpolate import RectBivariateSpline
        
        # Convert strikes to moneyness (K/S)
        moneyness = self.strikes / spot_price
        
        self.surface = RectBivariateSpline(
            moneyness, self.maturities, implied_vols
        )
    
    def get_volatility(self, strike: float, maturity: float, spot_price: float) -> float:
        """Get interpolated volatility for specific strike and maturity"""
        if self.surface is None:
            raise ValueError("Surface not fitted yet")
        
        moneyness = strike / spot_price
        return self.surface.ev(moneyness, maturity)
    
    def calculate_skew(self, maturity: float, spot_price: float) -> Dict:
        """
        Calculate volatility skew metrics
        
        Returns:
            Dictionary of skew metrics
        """
        # ATM volatility
        atm_vol = self.get_volatility(spot_price, maturity, spot_price)
        
        # 25 delta put and call
        put_25_strike = spot_price * 0.95  # Approximate
        call_25_strike = spot_price * 1.05  # Approximate
        
        put_25_vol = self.get_volatility(put_25_strike, maturity, spot_price)
        call_25_vol = self.get_volatility(call_25_strike, maturity, spot_price)
        
        # Risk reversal and butterfly
        risk_reversal = call_25_vol - put_25_vol
        butterfly = (call_25_vol + put_25_vol) / 2 - atm_vol
        
        return {
            'atm_volatility': atm_vol,
            'put_25_vol': put_25_vol,
            'call_25_vol': call_25_vol,
            'risk_reversal': risk_reversal,
            'butterfly': butterfly,
            'skew': put_25_vol - atm_vol,
        }


if __name__ == "__main__":
    # Example usage
    S = 100.0  # Stock price
    K = 100.0  # Strike
    T = 1.0    # 1 year to maturity
    r = 0.05   # 5% risk-free rate
    sigma = 0.3  # 30% volatility
    
    print("Black-Scholes Pricing:")
    print(f"Call: ${BlackScholesModel.call_price(S, K, T, r, sigma):.2f}")
    print(f"Put: ${BlackScholesModel.put_price(S, K, T, r, sigma):.2f}")
    
    print("\nOption Greeks (Call):")
    greeks = BlackScholesModel.call_greeks(S, K, T, r, sigma)
    for greek, value in greeks.items():
        print(f"  {greek}: {value:.4f}")
    
    print("\nImplied Volatility:")
    market_price = 15.0
    iv = BlackScholesModel.implied_volatility(market_price, S, K, T, r, 'call')
    print(f"  Implied vol: {iv:.2%}")
    
    print("\nBinomial Model:")
    binomial = BinomialModel(n_steps=100)
    american_call = binomial.price_option(S, K, T, r, sigma, 'call', american=True)
    european_call = binomial.price_option(S, K, T, r, sigma, 'call', american=False)
    print(f"  American Call: ${american_call:.2f}")
    print(f"  European Call: ${european_call:.2f}")
    
    print("\nMonte Carlo:")
    mc = MonteCarloOptionPricing(n_simulations=100000)
    mc_price, mc_se = mc.price_european(S, K, T, r, sigma, 'call')
    print(f"  European Call: ${mc_price:.2f} (±${1.96*mc_se:.2f})")
