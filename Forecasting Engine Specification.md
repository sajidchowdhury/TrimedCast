# Forecasting Engine Specification

**Project**: TrimedCast — Integrated Seasonal Demand & Inventory Forecasting System  
**Document Type**: Technical Specification — Forecasting Engine  
**Version**: 1.0.0  
**Status**: Production-Ready  
**Author**: TrimedCast Engineering Team  
**Last Updated**: 2025-03-04  
**Confidentiality**: Internal — Engineering Use Only  

---

## Table of Contents

1. [Document Purpose](#document-purpose)
2. [Architecture Overview](#section-1-architecture-overview)
3. [Mathematical Models — Detailed Specification](#section-2-mathematical-models--detailed-specification)
4. [Consensus Forecast Logic](#section-3-consensus-forecast-logic)
5. [Error Metrics & Auto-Recalibration](#section-4-error-metrics--auto-recalibration)
6. [Python FastAPI — API Endpoints](#section-5-python-fastapi--api-endpoints)
7. [Configuration Reference](#section-6-configuration-reference)
8. [Performance Requirements](#section-7-performance-requirements)
9. [Deployment & Infrastructure](#section-8-deployment--infrastructure)
10. [Monitoring & Observability](#section-9-monitoring--observability)
11. [Security Considerations](#section-10-security-considerations)
12. [Appendix A: BD Season Calendar](#appendix-a-bd-season-calendar)
13. [Appendix B: Glossary](#appendix-b-glossary)
14. [Appendix C: Error Codes](#appendix-c-error-codes)

---

## Document Purpose

This document specifies the complete forecasting engine for the TrimedCast platform — the mathematical models, the Python microservice architecture, API contracts, configuration, Bangladesh (BD)-specific seasonal logic, error metrics, and auto-recalibration triggers.

TrimedCast is an **Integrated Seasonal Demand & Inventory Forecasting System** designed specifically for motorcycle parts businesses in Bangladesh, operating as a **multi-tenant SaaS platform**. The forecasting engine is the intellectual core of the system, responsible for:

- **Demand Forecasting**: Predicting future demand for each SKU using multiple statistical models
- **Inventory Optimization**: Calculating optimal order quantities, safety stock levels, and reorder points
- **Order Trigger Timing**: Determining the exact date an order must be placed to avoid stockout, accounting for BD–China supply chain lead times and Chinese New Year (CNY) shutdowns
- **Consensus Planning**: Combining quantitative models with qualitative intelligence (marketing promos, sales field input) into a single agreed-upon forecast
- **Continuous Calibration**: Monitoring forecast accuracy and auto-recalibrating models when error thresholds are breached

The forecasting engine runs as a **Python FastAPI microservice** alongside the primary **Laravel 11** backend, communicating via **Redis queues** and **PostgreSQL** shared database.

---

## Section 1: Architecture Overview

### 1.1 Service Architecture

| Component | Technology | Role |
|-----------|-----------|------|
| Primary Backend | Laravel 11 (PHP 8.3) | CRUD operations, authentication, RBAC, tenant management, queue dispatch, WebSocket broadcasting |
| Forecasting Microservice | Python 3.12 + FastAPI | All mathematical computations: Prophet, regression, EOQ, safety stock, order triggers |
| Job Queue | Redis 7.x | Async job dispatch between Laravel and Python; job status tracking |
| Database | PostgreSQL 16.x | Shared data store; Laravel and Python both read/write |
| Cache | Redis 7.x | Forecast result caching, session management, rate limiting |
| Frontend | Next.js / Inertia.js | Dashboard, reports, visualizations |
| Containerization | Docker + Docker Compose | Service packaging and orchestration |

#### Why a Separate Python Microservice?

The forecasting engine is isolated from the Laravel monolith for the following reasons:

1. **Library Ecosystem**: Prophet (Facebook's time-series library), statsmodels (regression/seasonal decomposition), scikit-learn (metrics, EOQ/SS calculations), numpy/pandas (data manipulation) — all Python-native with no PHP equivalents of comparable quality
2. **Computational Isolation**: Forecasting is CPU-intensive; isolating it prevents blocking Laravel's web-serving workers
3. **Independent Scaling**: Python workers can be scaled horizontally (add more Docker containers) independently of the Laravel app
4. **Polyglot Architecture**: Laravel excels at web framework concerns (auth, routing, ORM, queue management); Python excels at numerical computation — use each for its strength

### 1.2 Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              TRIMEDCAST DATA FLOW                           │
└──────────────────────────────────────────────────────────────────────────────┘

 1. USER ACTION (Dashboard)
    │
    ▼
 2. LARAVEL BACKEND
    │  ─ Validates request
    │  ─ Authorizes tenant access
    │  ─ Dispatches forecast job to Redis queue
    │
    ▼
 3. REDIS QUEUE (forecast:jobs)
    │  ─ Job payload: { tenant_id, product_ids, season, horizon, method }
    │
    ▼
 4. PYTHON FASTAPI WORKER
    │  ─ Picks up job from Redis
    │  ─ Loads historical sales data from PostgreSQL
    │  │
    │  ├──► Prophet Model (seasonal forecast)
    │  ├──► Linear Regression Model (baseline)
    │  ├──► Exponential Smoothing (short-term)
    │  ├──► EOQ Calculator (optimal order qty)
    │  ├──► Safety Stock Calculator (buffer)
    │  └──► Order Trigger Calculator (when to order)
    │
    ▼
 5. RESULTS WRITTEN TO PostgreSQL
    │  ─ forecasts table (demand predictions)
    │  ─ inventory_recommendations table (EOQ, SS, ROP)
    │  ─ order_triggers table (timeline with milestones)
    │  ─ forecast_metrics table (MAPE, MAE, RMSE, MSE)
    │
    ▼
 6. API CALLBACK / POLL
    │  ─ Python notifies Laravel job is complete
    │
    ▼
 7. LARAVEL BACKEND
    │  ─ Updates job status
    │  ─ Broadcasts via WebSocket (Reverb / Pusher)
    │
    ▼
 8. FRONTEND DASHBOARD
    ─ Real-time update: new forecast results displayed
```

### 1.3 Python Service Stack

| Package | Version | Purpose |
|---------|---------|---------|
| FastAPI | 0.110+ | Async REST framework for API endpoints |
| Uvicorn | 0.27+ | ASGI server for FastAPI |
| Prophet | 1.1.5 | Facebook's time-series forecasting with built-in seasonality |
| statsmodels | 0.14+ | Linear regression (OLS), seasonal decomposition, exponential smoothing (Holt-Winters) |
| scikit-learn | 1.4+ | Error metrics (MAE, MSE, RMSE, MAPE), StandardScaler for normalization |
| numpy | 1.26+ | Numerical computation, array operations |
| pandas | 2.2+ | Data manipulation, time-series handling |
| rq (Redis Queue) | 1.16+ | Job queue integration with Redis |
| asyncpg | 0.29+ | Async PostgreSQL driver (high performance) |
| SQLAlchemy | 2.0+ | ORM for PostgreSQL access (async mode) |
| Alembic | 1.13+ | Database migrations for Python schema |
| Pydantic | 2.5+ | Request/response validation and serialization |
| structlog | 23+ | Structured logging (JSON format) |
| prometheus-client | 0.20+ | Metrics export for Prometheus monitoring |
| httpx | 0.27+ | Async HTTP client for API callbacks to Laravel |

### 1.4 Directory Structure (Python Microservice)

```
forecasting-service/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI application entry point
│   ├── config.py                  # Configuration loading (env vars, tenant overrides)
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── health.py          # GET /health
│   │   │   ├── forecast.py        # POST /forecast/run, GET /forecast/status/{job_id}
│   │   │   ├── calculate.py       # POST /calculate/eoq, /calculate/order-trigger
│   │   │   ├── backtest.py        # POST /forecast/backtest
│   │   │   └── analysis.py        # POST /analysis/seasonal-decompose
│   │   └── schemas/
│   │       ├── forecast.py        # Pydantic models for forecast requests/responses
│   │       ├── calculate.py       # Pydantic models for EOQ/SS/trigger
│   │       └── metrics.py         # Pydantic models for backtest/metrics
│   ├── models/
│   │   ├── __init__.py
│   │   ├── prophet_model.py       # Prophet wrapper with BD seasonality
│   │   ├── regression_model.py    # Multi-linear regression (OLS)
│   │   ├── exp_smoothing_model.py # Exponential smoothing with auto-tune
│   │   ├── eoq_model.py           # Economic Order Quantity
│   │   ├── safety_stock_model.py  # Safety stock with lead time variance
│   │   ├── order_trigger_model.py # Order trigger date calculator
│   │   └── consensus_model.py     # Consensus forecast combiner
│   ├── services/
│   │   ├── __init__.py
│   │   ├── forecast_service.py    # Orchestrates full forecast pipeline
│   │   ├── backtest_service.py    # Backtest runner with rolling origin
│   │   ├── recalibration_service.py # Auto-recalibration logic
│   │   └── callback_service.py    # Notifies Laravel on job completion
│   ├── db/
│   │   ├── __init__.py
│   │   ├── connection.py          # Async SQLAlchemy session factory
│   │   ├── repositories/
│   │   │   ├── sales_repo.py     # Read sales_history
│   │   │   ├── forecast_repo.py  # Write forecasts, read/write metrics
│   │   │   ├── inventory_repo.py # Read stock levels, write recommendations
│   │   │   └── tenant_repo.py    # Read tenant configuration overrides
│   │   └── migrations/           # Alembic migration files
│   ├── workers/
│   │   ├── __init__.py
│   │   ├── forecast_worker.py     # RQ worker entry point
│   │   └── worker_config.py      # Worker configuration
│   └── utils/
│       ├── __init__.py
│       ├── bd_seasons.py          # Bangladesh season/calendar helpers
│       ├── bd_holidays.py         # BD holiday calendar (Eid, Puja, etc.)
│       ├── cny_calendar.py        # Chinese New Year shutdown calculator
│       ├── outlier_detection.py   # Sigma-based outlier removal
│       └── metrics.py             # MAPE, MAE, MSE, RMSE calculators
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── Dockerfile
├── docker-compose.yml
├── pyproject.toml
├── requirements.txt
└── .env.example
```

### 1.5 Inter-Service Communication Detail

#### Laravel → Python (Job Dispatch)

Laravel dispatches a forecast job by pushing a JSON payload to a Redis list:

```php
// Laravel: app/Jobs/DispatchForecastJob.php

class DispatchForecastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public int $tenantId,
        public array $productIds,
        public string $season,
        public int $forecastHorizonMonths = 6,
        public ?string $methodOverride = null,
    ) {}

    public function handle(): void
    {
        $payload = [
            'job_id'        => (string) Str::uuid(),
            'tenant_id'     => $this->tenantId,
            'product_ids'   => $this->productIds,
            'season'        => $this->season,
            'horizon_months'=> $this->forecastHorizonMonths,
            'method'        => $this->methodOverride,
            'callback_url'  => config('services.forecasting.callback_url'),
            'dispatched_at' => now()->toIso8601String(),
        ];

        Redis::lpush('forecast:jobs', json_encode($payload));

        // Track job in database
        ForecastJob::create([
            'job_id'    => $payload['job_id'],
            'tenant_id' => $this->tenantId,
            'status'    => 'queued',
            'payload'   => $payload,
        ]);
    }
}
```

#### Python → Laravel (Callback on Completion)

```python
# app/services/callback_service.py

import httpx
from app.config import settings

async def notify_job_complete(job_id: str, status: str, results: dict):
    """Notify Laravel backend that a forecast job has completed."""
    payload = {
        "job_id": job_id,
        "status": status,
        "results_summary": {
            "products_forecasted": results.get("product_count", 0),
            "method_used": results.get("method", "prophet"),
            "mape_avg": results.get("avg_mape", None),
            "completed_at": datetime.utcnow().isoformat(),
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{settings.LARAVEL_CALLBACK_URL}/api/internal/forecast/callback",
            json=payload,
            headers={"X-Service-Token": settings.SERVICE_AUTH_TOKEN},
        )
        response.raise_for_status()
```

---

## Section 2: Mathematical Models — Detailed Specification

### 2.1 Model 1: Multi-Linear Regression (Baseline Forecast)

#### Purpose

Provides a **baseline demand estimate** based on price and promotional activity. This model answers: "Given the current price and promotional intensity, what is the expected demand?"

#### Formula

$$D(F) = \beta_0 + \beta_1 \times \text{Price} + \beta_2 \times \text{PromoIndex}$$

| Variable | Symbol | Type | Description |
|----------|--------|------|-------------|
| Forecasted Demand | D(F) | Dependent | Units demanded in the forecast period |
| Intercept | β₀ | Coefficient | Base demand when Price = 0 and PromoIndex = 0 |
| Price Coefficient | β₁ | Coefficient | Price elasticity — change in demand per 1 BDT price increase (typically negative) |
| Promo Coefficient | β₂ | Coefficient | Promo impact — change in demand per 0.1 promo_index increase (typically positive) |
| Price | Price | Independent | Product selling price in BDT |
| Promo Index | PromoIndex | Independent | Normalized promotional intensity: 0.0 = no promo, 1.0 = maximum promo activity |

#### Beta Coefficients Interpretation

| Coefficient | Interpretation | Example (BDT) | Business Meaning |
|-------------|---------------|---------------|------------------|
| β₀ | Base demand (intercept) | 150 units/month | Demand when price and promo are at zero — theoretical baseline |
| β₁ | Price elasticity | -2.5 units/BDT | Each 1 BDT price increase reduces demand by 2.5 units |
| β₂ | Promo impact | +30 units/0.1 index | Each 0.1 increase in promo_index adds 30 units of demand |

#### Implementation

```python
# app/models/regression_model.py

import numpy as np
import pandas as pd
from statsmodels.regression.linear_model import OLS
from statsmodels.tools.tools import add_constant
from app.utils.outlier_detection import remove_sigma_outliers


class RegressionModel:
    """
    Multi-Linear Regression baseline forecast model.

    D(F) = β₀ + β₁(Price) + β₂(Promo)
    """

    def __init__(self, config: dict):
        self.regression_window_months = config.get("regression_window_months", 36)
        self.min_data_points = config.get("min_data_points", 12)
        self.outlier_sigma_threshold = config.get("outlier_sigma_threshold", 3.0)

    def fit(self, df: pd.DataFrame) -> dict:
        """
        Fit the OLS regression model on historical sales data.

        Args:
            df: DataFrame with columns [date, qty_sold, price, promo_index]
                Must have at least self.min_data_points rows.

        Returns:
            Dictionary with coefficients, R², p-values, and model metadata.

        Raises:
            ValueError: If insufficient data points after outlier removal.
        """
        # Validate minimum data points
        if len(df) < self.min_data_points:
            raise ValueError(
                f"Insufficient data: {len(df)} rows, "
                f"minimum required: {self.min_data_points}"
            )

        # Remove outliers beyond sigma threshold
        df_clean = remove_sigma_outliers(
            df,
            column="qty_sold",
            sigma_threshold=self.outlier_sigma_threshold,
        )

        if len(df_clean) < self.min_data_points:
            raise ValueError(
                f"Insufficient data after outlier removal: {len(df_clean)} rows, "
                f"minimum required: {self.min_data_points}"
            )

        # Prepare feature matrix X and target y
        X = df_clean[["price", "promo_index"]].values
        X = add_constant(X)  # Adds β₀ intercept column
        y = df_clean["qty_sold"].values

        # Fit OLS model
        model = OLS(y, X).fit()

        return {
            "beta_0": float(model.params[0]),       # Intercept
            "beta_1": float(model.params[1]),       # Price coefficient
            "beta_2": float(model.params[2]),       # Promo coefficient
            "r_squared": float(model.rsquared),     # Model fit
            "adj_r_squared": float(model.rsquared_adj),
            "p_value_price": float(model.pvalues[1]),
            "p_value_promo": float(model.pvalues[2]),
            "f_statistic": float(model.fvalue),
            "f_pvalue": float(model.f_pvalue),
            "std_err_beta_0": float(model.bse[0]),
            "std_err_beta_1": float(model.bse[1]),
            "std_err_beta_2": float(model.bse[2]),
            "data_points_used": len(df_clean),
            "outliers_removed": len(df) - len(df_clean),
            "aic": float(model.aic),
            "bic": float(model.bic),
        }

    def predict(self, coefficients: dict, price: float, promo_index: float) -> float:
        """
        Generate a demand forecast using fitted coefficients.

        Args:
            coefficients: Dict with beta_0, beta_1, beta_2 from fit()
            price: Current/future product price in BDT
            promo_index: Promo intensity 0.0-1.0

        Returns:
            Forecasted demand in units (float). Caller should round/ceil as needed.
        """
        forecast = (
            coefficients["beta_0"]
            + coefficients["beta_1"] * price
            + coefficients["beta_2"] * promo_index
        )
        return max(0.0, forecast)  # Demand cannot be negative
```

#### Statistical Validation Checks

| Check | Criterion | Action if Failed |
|-------|-----------|-----------------|
| R² goodness-of-fit | R² ≥ 0.3 | Log warning; model may be unreliable for this SKU |
| Price coefficient sign | β₁ < 0 | Log warning if positive (Giffen good — unusual for motorcycle parts) |
| Promo coefficient sign | β₂ > 0 | Log warning if negative (promo reduces demand — data quality issue) |
| F-test significance | F p-value < 0.05 | Flag model as statistically insignificant |
| Multicollinearity (VIF) | VIF < 5 for all predictors | If VIF ≥ 5, price and promo may be confounded |
| Residual normality | Shapiro-Wilk p > 0.05 | If non-normal, confidence intervals may be unreliable |

#### Configuration Per Tenant

| Parameter | Default | Valid Range | Description |
|-----------|---------|------------|-------------|
| `regression_window_months` | 36 | 12–60 | Number of months of historical data to use |
| `min_data_points` | 12 | 6–24 | Minimum data points required to fit the model |
| `outlier_sigma_threshold` | 3.0 | 2.0–5.0 | Data points beyond this σ are excluded |

---

### 2.2 Model 2: Prophet (Seasonal Forecast — Primary Model)

#### Why Prophet Over Simple Regression

| Capability | Prophet | Linear Regression | Exponential Smoothing |
|-----------|---------|-------------------|----------------------|
| Automatic seasonality detection | ✅ | ❌ | ❌ (must specify period) |
| Holiday effects | ✅ Built-in | ❌ | ❌ |
| Missing data handling | ✅ | ❌ (requires complete) | ⚠️ Partial |
| Outlier robustness | ✅ | ❌ (skews OLS) | ❌ |
| Confidence intervals | ✅ Automatic | ⚠️ (assumes normality) | ⚠️ |
| Trend changepoints | ✅ Automatic | ❌ (single trend) | ❌ |
| Multiplicative seasonality | ✅ | ❌ (additive only) | ⚠️ |
| Non-linear trends | ✅ | ❌ | ❌ |

#### Prophet Configuration

```python
# app/models/prophet_model.py

from prophet import Prophet
from prophet.serialize import model_to_json, model_from_json
import pandas as pd
from datetime import datetime
from app.utils.bd_holidays import get_bd_holidays
from app.utils.bd_seasons import get_bd_custom_seasonalities
from app.utils.cny_calendar import get_cny_shutdown_window


class ProphetModel:
    """
    Prophet-based seasonal forecast model with BD-specific customizations.
    """

    def __init__(self, config: dict):
        self.changepoint_prior_scale = config.get(
            "prophet_changepoint_prior_scale", 0.05
        )
        self.seasonality_prior_scale = config.get(
            "prophet_seasonality_prior_scale", 10.0
        )
        self.holidays_prior_scale = config.get(
            "prophet_holidays_prior_scale", 10.0
        )
        self.mcmc_samples = config.get("prophet_mcmc_samples", 0)

    def build_model(
        self,
        year: int,
        include_cny: bool = True,
    ) -> Prophet:
        """
        Build a Prophet model with BD-specific configuration.

        Args:
            year: The forecast year (used to generate holiday dates)
            include_cny: Whether to include CNY as a supply holiday

        Returns:
            Configured Prophet model instance (not yet fitted).
        """
        # Get BD holidays for the relevant year range
        holidays_df = get_bd_holidays(
            years=[year - 1, year, year + 1],
            include_cny_supply_holiday=include_cny,
        )

        model = Prophet(
            # --- Core Configuration ---
            yearly_seasonality=True,            # BD has strong yearly seasonal patterns
            weekly_seasonality=False,           # Motorcycle parts are NOT weekly-cyclical
            daily_seasonality=False,            # Not relevant for monthly/weekly data
            seasonality_mode="multiplicative",  # Seasonal effects MULTIPLY baseline

            # --- Prior Scales (control overfitting) ---
            changepoint_prior_scale=self.changepoint_prior_scale,  # 0.05 = conservative
            seasonality_prior_scale=self.seasonality_prior_scale,  # 10 = strong seasonal
            holidays_prior_scale=self.holidays_prior_scale,        # 10 = strong holiday effect

            # --- Performance ---
            mcmc_samples=self.mcmc_samples,  # 0 = fast MAP estimation (no full Bayesian)

            # --- Holidays ---
            holidays=holidays_df,
        )

        # --- BD-Specific Custom Seasonalities ---
        # These capture patterns that Prophet's default yearly Fourier series
        # may not adequately represent for the BD climate cycle.

        # Winter Season (Nov-Feb): 4-month period
        # Strong positive effect for cold-weather parts (jackets, fog lamps, chain lube)
        model.add_seasonality(
            name="bd_winter",
            period=365.25 / 3,       # ~121.75 days (4-month cycle within year)
            fourier_order=3,          # Enough to capture the Nov-Feb peak shape
            prior_scale=15.0,         # Strong winter effect
            condition_name="is_winter",
        )

        # Monsoon Season (Jun-Sep): 4-month period
        # Negative effect for street parts, positive for off-road/mud-specific parts
        model.add_seasonality(
            name="bd_monsoon",
            period=365.25 / 3,       # ~121.75 days
            fourier_order=3,
            prior_scale=12.0,
            condition_name="is_monsoon",
        )

        # Pre-Winter Spike (October): transition month
        # Dealers pre-order before winter; brief demand surge
        model.add_seasonality(
            name="bd_pre_winter",
            period=365.25,           # Annual cycle
            fourier_order=2,         # Simpler shape — single spike
            prior_scale=8.0,
            condition_name="is_pre_winter",
        )

        return model

    def fit_predict(
        self,
        df: pd.DataFrame,
        forecast_horizon_days: int = 180,
        product_category: str = "general",
    ) -> dict:
        """
        Fit Prophet model and generate forecast.

        Args:
            df: DataFrame with columns [ds (datetime), y (float qty_sold)]
                Must be sorted by ds ascending.
            forecast_horizon_days: Number of days to forecast ahead.
            product_category: Used to select seasonality condition columns
                              (e.g., 'cold_weather', 'off_road', 'street')

        Returns:
            Dictionary with forecast values, confidence intervals, and components.
        """
        # Validate input
        if len(df) < 24:
            raise ValueError(
                f"Prophet requires at least 24 months of data; got {len(df)} rows"
            )

        # Add seasonal condition columns based on BD calendar
        df = self._add_season_conditions(df, product_category)

        # Build and fit model
        forecast_year = df["ds"].max().year
        model = self.build_model(year=forecast_year)
        model.fit(df)

        # Generate future dataframe
        future = model.make_future_dataframe(
            periods=forecast_horizon_days,
            freq="D",
        )
        future = self._add_season_conditions(future, product_category)

        # Make predictions
        forecast = model.predict(future)

        # Extract results
        results = {
            "forecast": forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].to_dict(
                orient="records"
            ),
            "components": {
                "trend": forecast["trend"].tolist(),
                "yearly": forecast.get("yearly", pd.Series()).tolist(),
                "bd_winter": forecast.get("bd_winter", pd.Series()).tolist(),
                "bd_monsoon": forecast.get("bd_monsoon", pd.Series()).tolist(),
                "bd_pre_winter": forecast.get("bd_pre_winter", pd.Series()).tolist(),
                "holidays": forecast.get("holidays", pd.Series()).tolist(),
            },
            "model_serialized": model_to_json(model),  # For caching/reuse
        }

        return results

    def _add_season_conditions(
        self, df: pd.DataFrame, product_category: str
    ) -> pd.DataFrame:
        """
        Add boolean condition columns for custom seasonalities.

        These columns tell Prophet when each custom seasonality is "active".
        The values depend on the product category because monsoon has OPPOSITE
        effects for different product types.
        """
        df = df.copy()

        month = df["ds"].dt.month

        # Winter: active Nov(11), Dec(12), Jan(1), Feb(2)
        df["is_winter"] = month.isin([11, 12, 1, 2]).astype(int)

        # Monsoon: active Jun(6), Jul(7), Aug(8), Sep(9)
        # For cold_weather / general parts: monsoon REDUCES demand
        # For off_road / mud parts: monsoon INCREASES demand
        if product_category in ("off_road", "mud_chain", "off_road_tire"):
            df["is_monsoon"] = month.isin([6, 7, 8, 9]).astype(int)
        else:
            df["is_monsoon"] = month.isin([6, 7, 8, 9]).astype(int)

        # Pre-Winter: active Oct(10) only
        df["is_pre_winter"] = (month == 10).astype(int)

        return df
```

#### BD-Specific Custom Seasonalities — Detail

| Seasonality Name | Period | Fourier Order | Active Months | Effect Direction | Affected Products |
|-----------------|--------|---------------|---------------|-----------------|-------------------|
| `bd_winter` | 365.25/3 ≈ 121.75 days | 3 | Nov, Dec, Jan, Feb | **Positive** (+30-60% demand lift) | Cold-weather parts: fog lamps, chain lubricant, winter jackets, handlebar grips, heated grips, engine covers |
| `bd_monsoon` | 365.25/3 ≈ 121.75 days | 3 | Jun, Jul, Aug, Sep | **Negative** for street parts (-20-40%) / **Positive** for off-road (+15-30%) | Street: tires (slick), visors, fairings. Off-road: knobby tires, mud chains, splash guards |
| `bd_pre_winter` | 365.25 days | 2 | Oct only | **Positive** (pre-order spike +10-25%) | All seasonal parts — dealers stock up before winter |

#### BD Holidays — Implementation

```python
# app/utils/bd_holidays.py

import pandas as pd
from datetime import date, timedelta


# BD Islamic holidays are lunar and shift ~11 days earlier each Gregorian year.
# These dates must be updated annually. The system stores them in a config table
# and falls back to these hardcoded values.

BD_HOLIDAY_DATES = {
    2024: {
        "Eid-ul-Fitr":     [("2024-04-10", "2024-04-16")],  # ~1 week
        "Eid-ul-Adha":     [("2024-06-16", "2024-06-22")],  # ~1 week
        "Durga Puja":      [("2024-10-10", "2024-10-14")],  # 5 days
        "Independence Day": [("2024-03-26", "2024-03-26")],  # 1 day
        "Pohela Boishakh": [("2024-04-14", "2024-04-14")],  # 1 day (Bengali New Year)
    },
    2025: {
        "Eid-ul-Fitr":     [("2025-03-30", "2025-04-05")],
        "Eid-ul-Adha":     [("2025-06-06", "2025-06-12")],
        "Durga Puja":      [("2025-10-01", "2025-10-05")],
        "Independence Day": [("2025-03-26", "2025-03-26")],
        "Pohela Boishakh": [("2025-04-14", "2025-04-14")],
    },
    2026: {
        "Eid-ul-Fitr":     [("2026-03-19", "2026-03-25")],
        "Eid-ul-Adha":     [("2026-05-26", "2026-06-01")],
        "Durga Puja":      [("2026-10-19", "2026-10-23")],
        "Independence Day": [("2026-03-26", "2026-03-26")],
        "Pohela Boishakh": [("2026-04-14", "2026-04-14")],
    },
}

# Holiday effect on motorcycle parts demand:
# - Eid: Reduced sales (shops closed, people traveling)
# - Durga Puja: Mixed — some segments UP (gift-giving, new bike purchases)
# - Independence Day: Slight dip
# - Pohela Boishakh: Slight boost (new year purchases)

HOLIDAY_EFFECTS = {
    "Eid-ul-Fitr":      -0.30,  # 30% demand reduction during Eid week
    "Eid-ul-Adha":      -0.25,  # 25% demand reduction
    "Durga Puja":       +0.10,  # 10% demand increase (some segments)
    "Independence Day":  -0.05,  # 5% demand reduction
    "Pohela Boishakh":  +0.08,  # 8% demand increase (new year purchases)
}


def get_bd_holidays(
    years: list[int],
    include_cny_supply_holiday: bool = True,
) -> pd.DataFrame:
    """
    Generate Prophet-compatible holidays DataFrame for BD.

    Args:
        years: List of years to generate holidays for.
        include_cny_supply_holiday: Include CNY as a holiday.
            CNY is NOT a sales holiday — it's a SUPPLY holiday.
            We include it in Prophet so the model can account for
            the supply disruption effect on order timing.

    Returns:
        DataFrame with columns [holiday, ds, lower_window, upper_window]
    """
    records = []

    for year in years:
        if year not in BD_HOLIDAY_DATES:
            continue

        for holiday_name, date_ranges in BD_HOLIDAY_DATES[year].items():
            for start_str, end_str in date_ranges:
                start = pd.Timestamp(start_str)
                end = pd.Timestamp(end_str)
                for d in pd.date_range(start, end, freq="D"):
                    records.append({
                        "holiday": holiday_name,
                        "ds": d,
                        "lower_window": 0,
                        "upper_window": 0,
                    })

    if include_cny_supply_holiday:
        cny_records = get_cny_as_holiday(years)
        records.extend(cny_records)

    return pd.DataFrame(records)


def get_cny_as_holiday(years: list[int]) -> list[dict]:
    """
    CNY Impact as Holiday:
    Chinese New Year (Jan 20 — Feb 20): NOT a sales holiday,
    but a SUPPLY holiday — no new orders can be placed with Chinese
    suppliers during this window. We model this as a Prophet holiday
    so the order trigger logic can account for it.
    """
    from app.utils.cny_calendar import get_cny_shutdown_window

    records = []
    for year in years:
        cny_start, cny_end = get_cny_shutdown_window(year)
        for d in pd.date_range(cny_start, cny_end, freq="D"):
            records.append({
                "holiday": "CNY_Supply_Shutdown",
                "ds": d,
                "lower_window": 0,
                "upper_window": 0,
            })
    return records
```

#### CNY Calendar — Implementation

```python
# app/utils/cny_calendar.py

from datetime import date, timedelta


# Chinese New Year dates (the lunar new year falls on different Gregorian dates each year).
# CNY shutdown for Chinese factories/suppliers is typically:
# - Start: ~10 days before CNY day (factories wind down)
# - End: ~15-20 days after CNY day (factories restart, backlog clears)
# We use a conservative window: Jan 20 — Feb 20 (~30 days)

CNY_DATES = {
    2024: date(2024, 2, 10),   # Year of the Dragon
    2025: date(2025, 1, 29),   # Year of the Snake
    2026: date(2026, 2, 17),   # Year of the Horse
    2027: date(2027, 2, 6),    # Year of the Goat
    2028: date(2028, 1, 26),   # Year of the Monkey
    2029: date(2029, 2, 13),   # Year of the Rooster
    2030: date(2030, 2, 3),    # Year of the Dog
}


def get_cny_shutdown_window(year: int) -> tuple[date, date]:
    """
    Calculate the CNY supply shutdown window for a given year.

    Conservative window: January 20 to February 20.
    This covers factory shutdown, worker migration, and restart backlog.

    Args:
        year: The Gregorian year.

    Returns:
        Tuple of (shutdown_start_date, shutdown_end_date).
    """
    return (date(year, 1, 20), date(year, 2, 20))


def get_cny_buffer_days(year: int) -> int:
    """
    Additional buffer days to account for:
    - Post-CNY backlog at supplier (orders placed before CNY get priority)
    - Shipping congestion after CNY (all Chinese exporters ship simultaneously)

    Returns:
        Buffer in days (typically 7-14 days).
    """
    return 10  # Conservative default


def does_date_fall_in_cny(target_date: date) -> bool:
    """
    Check if a given date falls within the CNY shutdown window.
    """
    year = target_date.year
    cny_start, cny_end = get_cny_shutdown_window(year)
    return cny_start <= target_date <= cny_end


def adjust_for_cny(
    proposed_order_date: date,
    year: int,
    strategy: str = "before",
) -> dict:
    """
    Adjust an order date to avoid the CNY shutdown window.

    Args:
        proposed_order_date: The originally calculated order trigger date.
        year: The Gregorian year.
        strategy: "before" (order before CNY starts) or "after" (order after CNY ends).

    Returns:
        Dictionary with adjusted date, CNY risk flag, and explanation.
    """
    cny_start, cny_end = get_cny_shutdown_window(year)
    buffer = get_cny_buffer_days(year)

    if not (cny_start <= proposed_order_date <= cny_end):
        return {
            "adjusted_date": proposed_order_date,
            "cny_risk": False,
            "original_date": proposed_order_date,
            "explanation": "Order date does not fall in CNY window. No adjustment needed.",
        }

    if strategy == "before":
        adjusted = cny_start - timedelta(days=buffer + 1)
        explanation = (
            f"Order date {proposed_order_date} falls in CNY shutdown "
            f"({cny_start} to {cny_end}). Adjusted to order BEFORE CNY: {adjusted}. "
            f"This avoids stockout but requires earlier cash outflow."
        )
    else:  # strategy == "after"
        adjusted = cny_end + timedelta(days=1)
        explanation = (
            f"Order date {proposed_order_date} falls in CNY shutdown "
            f"({cny_start} to {cny_end}). Adjusted to order AFTER CNY: {adjusted}. "
            f"WARNING: This may cause stockout if current stock is insufficient "
            f"to cover the extended lead time."
        )

    return {
        "adjusted_date": adjusted,
        "cny_risk": True,
        "original_date": proposed_order_date,
        "cny_start": cny_start,
        "cny_end": cny_end,
        "strategy_used": strategy,
        "explanation": explanation,
    }
```

---

### 2.3 Model 3: Exponential Smoothing

#### Purpose

Provides a **short-term, responsive forecast** that heavily weights recent observations. Used as a complement to Prophet — particularly useful for:

- New products with limited history (< 2 years, where Prophet may be unreliable)
- Products with recent trend changes (Prophet's changepoint detection may lag)
- SKU-level short-term adjustments in the consensus forecast

#### Formula (Simple Exponential Smoothing)

$$F_{t+1} = \alpha \times A_t + (1 - \alpha) \times F_t$$

Where:
- $F_{t+1}$: Forecast for the next period
- $A_t$: Actual demand in the current period
- $F_t$: Forecast for the current period
- $\alpha$: Smoothing constant (0 < α < 1)

#### Alpha Selection Guide

| Alpha Range | Use Case | Behavior | Recommended For |
|-------------|----------|----------|-----------------|
| 0.1 – 0.3 | Stable/mature products | Smooth, slow-moving forecast; heavily weights history | Established SKUs with 3+ years of stable demand |
| 0.3 – 0.5 | Normal products | Balanced response to recent changes | Most motorcycle parts |
| 0.5 – 0.8 | New/trending products | Quick response to recent changes; volatile | New SKUs, products with recent demand shifts |
| 0.8 – 0.9 | Very volatile/reactive | Almost tracks actuals directly; minimal smoothing | Discontinued SKUs being run down, extreme trend shifts |

#### Implementation

```python
# app/models/exp_smoothing_model.py

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_percentage_error, mean_absolute_error
from typing import Optional


class ExponentialSmoothingModel:
    """
    Exponential Smoothing with auto-tune alpha selection.
    """

    def __init__(self, config: dict):
        self.default_alpha = config.get("default_alpha", 0.3)
        self.auto_tune = config.get("exp_smoothing_auto_tune", True)
        self.auto_tune_step = config.get("exp_smoothing_auto_tune_step", 0.1)

    def fit_predict(
        self,
        series: pd.Series,
        forecast_periods: int = 6,
        alpha: Optional[float] = None,
    ) -> dict:
        """
        Apply exponential smoothing and generate forecast.

        Args:
            series: Time series of actual demand values (sorted chronologically).
            forecast_periods: Number of periods to forecast ahead.
            alpha: Smoothing constant. If None, uses auto-tune or default.

        Returns:
            Dictionary with forecast, alpha used, and smoothed values.
        """
        if alpha is None:
            if self.auto_tune and len(series) >= 12:
                alpha = self._auto_tune_alpha(series)
            else:
                alpha = self.default_alpha

        # Apply exponential smoothing
        smoothed = self._smooth(series.values, alpha)

        # Forecast: for simple ES, the forecast is flat (last smoothed value)
        # This is appropriate for demand without strong trend/seasonality
        last_smoothed = smoothed[-1]
        forecast = np.full(forecast_periods, last_smoothed)

        return {
            "forecast": forecast.tolist(),
            "alpha": alpha,
            "smoothed_values": smoothed.tolist(),
            "last_smoothed_value": float(last_smoothed),
            "auto_tuned": alpha != self.default_alpha,
        }

    def _smooth(self, values: np.ndarray, alpha: float) -> np.ndarray:
        """
        Apply exponential smoothing to a 1D array.

        F[0] = A[0]  (initialize with first actual)
        F[t] = alpha * A[t] + (1 - alpha) * F[t-1]
        """
        smoothed = np.zeros_like(values, dtype=float)
        smoothed[0] = values[0]

        for t in range(1, len(values)):
            smoothed[t] = alpha * values[t] + (1 - alpha) * smoothed[t - 1]

        return smoothed

    def _auto_tune_alpha(self, series: pd.Series) -> float:
        """
        Auto-tune alpha by testing values from 0.1 to 0.9 and selecting
        the value that produces the lowest MAPE on backtest.

        Backtest approach:
        - Train on first 80% of data
        - Test on last 20%
        - Evaluate MAPE on test set

        Args:
            series: Full time series of actual demand.

        Returns:
            Best alpha value.
        """
        values = series.values
        split_idx = int(len(values) * 0.8)
        train = values[:split_idx]
        test = values[split_idx:]

        best_alpha = self.default_alpha
        best_mape = float("inf")

        alphas = np.arange(0.1, 1.0, self.auto_tune_step)

        for alpha in alphas:
            # Smooth on training data
            smoothed = self._smooth(train, alpha)

            # Forecast (flat) from last smoothed value
            forecast_values = np.full(len(test), smoothed[-1])

            # Calculate MAPE on test set
            try:
                mape = mean_absolute_percentage_error(test, forecast_values)
            except (ZeroDivisionError, ValueError):
                continue

            if mape < best_mape:
                best_mape = mape
                best_alpha = round(float(alpha), 2)

        return best_alpha
```

#### Configuration Per Tenant

| Parameter | Default | Valid Range | Description |
|-----------|---------|------------|-------------|
| `default_alpha` | 0.3 | 0.05–0.95 | Default smoothing constant |
| `exp_smoothing_auto_tune` | True | True/False | Whether to auto-tune alpha via backtest |
| `exp_smoothing_auto_tune_step` | 0.1 | 0.01–0.2 | Step size for alpha grid search |

---

### 2.4 Model 4: Economic Order Quantity (EOQ)

#### Purpose

Determines the **optimal order quantity** that minimizes total inventory cost (ordering cost + holding cost). This is the foundational inventory optimization formula.

#### Formula

$$EOQ = \sqrt{\frac{2KD}{h}}$$

| Variable | Symbol | Unit | Source | Description |
|----------|--------|------|--------|-------------|
| Ordering cost | K | BDT/order | Tenant config | Fixed cost per purchase order (paperwork, communication, inspection) |
| Annual demand | D | units/year | Prophet/Regression | Forecasted annual demand for the SKU |
| Holding cost | h | BDT/unit/year | Computed | Annual cost to hold one unit in inventory |

**Holding cost derivation**:

$$h = \text{unit\_cost\_bdt} \times \text{holding\_cost\_pct}$$

| Parameter | Default | Description |
|-----------|---------|-------------|
| unit_cost_bdt | Product-specific | Purchase price per unit from supplier (in BDT) |
| holding_cost_pct | 0.20 (20%) | Tenant configurable. Covers: warehouse space (5%), insurance (2%), obsolescence risk (8%), capital opportunity cost (5%) |

#### Implementation

```python
# app/models/eoq_model.py

import math
from typing import Optional


class EOQModel:
    """
    Economic Order Quantity calculator with BD-specific constraints.
    """

    def __init__(self, config: dict):
        self.default_ordering_cost = config.get("default_ordering_cost", 500.0)   # BDT
        self.default_holding_cost_pct = config.get("default_holding_cost_pct", 0.20)

    def calculate(
        self,
        annual_demand: float,
        unit_cost: float,
        ordering_cost: Optional[float] = None,
        holding_cost_pct: Optional[float] = None,
        max_stock_qty: Optional[int] = None,
        supplier_moq: Optional[int] = None,
        warehouse_capacity_remaining: Optional[int] = None,
    ) -> dict:
        """
        Calculate EOQ with all constraints applied.

        Args:
            annual_demand: Forecasted annual demand (units/year) from Prophet/Regression.
            unit_cost: Purchase price per unit in BDT.
            ordering_cost: Cost per purchase order in BDT. Uses default if None.
            holding_cost_pct: Holding cost as fraction of unit_cost. Uses default if None.
            max_stock_qty: Maximum stock quantity for this product (warehouse slot limit).
            supplier_moq: Supplier Minimum Order Quantity.
            warehouse_capacity_remaining: Remaining warehouse capacity in units.

        Returns:
            Dictionary with EOQ, constrained EOQ, and all intermediate values.
        """
        if ordering_cost is None:
            ordering_cost = self.default_ordering_cost
        if holding_cost_pct is None:
            holding_cost_pct = self.default_holding_cost_pct

        # Calculate holding cost per unit per year
        holding_cost_per_unit = unit_cost * holding_cost_pct

        # Standard EOQ formula: sqrt(2KD/h)
        eoq_unconstrained = math.sqrt(
            (2 * ordering_cost * annual_demand) / holding_cost_per_unit
        )

        # Apply constraints
        eoq = eoq_unconstrained
        constraints_applied = []

        # Constraint 1: EOQ must not exceed max_stock_qty
        if max_stock_qty is not None and eoq > max_stock_qty:
            eoq = float(max_stock_qty)
            constraints_applied.append(
                f"EOQ capped to max_stock_qty={max_stock_qty}"
            )

        # Constraint 2: EOQ must not be less than supplier MOQ
        if supplier_moq is not None and eoq < supplier_moq:
            eoq = float(supplier_moq)
            constraints_applied.append(
                f"EOQ raised to supplier_moq={supplier_moq}"
            )

        # Constraint 3: EOQ must consider remaining warehouse capacity
        if warehouse_capacity_remaining is not None and eoq > warehouse_capacity_remaining:
            eoq = float(warehouse_capacity_remaining)
            constraints_applied.append(
                f"EOQ capped to warehouse_capacity_remaining={warehouse_capacity_remaining}"
            )

        # Calculate derived values
        # Number of orders per year
        orders_per_year = annual_demand / eoq if eoq > 0 else 0

        # Order cycle time (days between orders)
        order_cycle_days = 365 / orders_per_year if orders_per_year > 0 else 0

        # Total annual ordering cost
        total_ordering_cost = orders_per_year * ordering_cost

        # Total annual holding cost
        total_holding_cost = (eoq / 2) * holding_cost_per_unit

        # Total annual inventory cost (ordering + holding)
        total_inventory_cost = total_ordering_cost + total_holding_cost

        return {
            "eoq": round(eoq),
            "eoq_unconstrained": round(eoq_unconstrained),
            "holding_cost_per_unit_bdt": round(holding_cost_per_unit, 2),
            "orders_per_year": round(orders_per_year, 2),
            "order_cycle_days": round(order_cycle_days, 1),
            "total_ordering_cost_bdt": round(total_ordering_cost, 2),
            "total_holding_cost_bdt": round(total_holding_cost, 2),
            "total_inventory_cost_bdt": round(total_inventory_cost, 2),
            "constraints_applied": constraints_applied,
            "inputs": {
                "annual_demand": annual_demand,
                "unit_cost_bdt": unit_cost,
                "ordering_cost_bdt": ordering_cost,
                "holding_cost_pct": holding_cost_pct,
                "max_stock_qty": max_stock_qty,
                "supplier_moq": supplier_moq,
                "warehouse_capacity_remaining": warehouse_capacity_remaining,
            },
        }
```

#### EOQ Example Calculation (BDT)

| Input | Value |
|-------|-------|
| Annual demand (D) | 1,200 units/year |
| Ordering cost (K) | 500 BDT/order |
| Unit cost | 150 BDT |
| Holding cost pct | 20% |
| Holding cost per unit (h) | 150 × 0.20 = 30 BDT/unit/year |

$$EOQ = \sqrt{\frac{2 \times 500 \times 1200}{30}} = \sqrt{40000} = 200 \text{ units}$$

| Result | Value |
|--------|-------|
| EOQ | 200 units per order |
| Orders per year | 6 orders |
| Order cycle | ~60.8 days between orders |
| Total ordering cost | 6 × 500 = 3,000 BDT/year |
| Total holding cost | (200/2) × 30 = 3,000 BDT/year |
| Total inventory cost | 6,000 BDT/year |

---

### 2.5 Model 5: Safety Stock (Comprehensive)

#### Purpose

Safety stock is the **buffer inventory** held to protect against:
1. **Demand uncertainty** — actual demand exceeding forecast
2. **Lead time variability** — supplier delivering later than expected
3. **Supply chain disruptions** — CNY, political instability, port congestion

This is critical for the BD–China supply chain where lead times are long (3-5 months) and variable.

#### Formula

$$SS = \frac{EOQ}{R} + (MAE \times \mu_t \times \sigma_{LT}) \times k$$

| Variable | Symbol | Unit | Source | Description |
|----------|--------|------|--------|-------------|
| Economic Order Quantity | EOQ | units | Model 4 | Optimal order quantity |
| Review period | R | days | Tenant config | Time between inventory reviews (default: 10 days) |
| Mean Absolute Error | MAE | units | Backtest | Average forecast error from backtest |
| Mean lead time | μₜ | days | purchase_history | Average actual lead time from historical orders |
| Lead time std dev | σ_LT | days | purchase_history | Standard deviation of actual lead times |
| Safety factor | k | dimensionless | Service level | z-score for desired service level |

#### Safety Factor (k) by Service Level

| Service Level | k (z-score) | Use Case |
|---------------|-------------|----------|
| 90% | 1.28 | Low-criticality parts (decorative, optional accessories) |
| 95% | 1.65 | Standard parts (default for most motorcycle parts) |
| 97.5% | 1.96 | High-turnover parts (brake pads, spark plugs, oil filters) |
| 99% | 2.33 | Critical parts (brake assemblies, engine components — stockout = safety risk) |
| 99.9% | 3.09 | Life-critical parts (brake discs, steering components) |

#### Lead Time Decomposition for BD–China Supply Chain

```
┌─────────────────────────────────────────────────────────────────────────┐
│              BD–CHINA SUPPLY CHAIN LEAD TIME DECOMPOSITION              │
├─────────────────────┬──────────────┬──────────────┬────────────────────┤
│     Component        │   Sea Route  │   Air Route  │    Notes           │
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ Manufacturing Days  │     90       │     90       │ Chinese factory    │
│ Shipment Days       │     52       │      8       │ Sea vs air freight │
│ Customs Days        │     10       │      3       │ BD customs clearance│
├─────────────────────┼──────────────┼──────────────┼────────────────────┤
│ TOTAL LEAD TIME     │    152 days  │    101 days  │                    │
│                     │  (~5 months) │ (~3.5 months)│                    │
└─────────────────────┴──────────────┴──────────────┴────────────────────┘
```

**Breakdown of Shipment Days (Sea Route)**:

| Leg | Days | Detail |
|-----|------|--------|
| Factory to port (China) | 3 | Truck from factory to Shanghai/Shenzhen port |
| Port processing (China) | 5 | Customs clearance, loading, documentation |
| Ocean transit | 28 | Shanghai/Chittagong — varies by shipping line |
| Port processing (BD) | 7 | Unloading, customs inspection at Chittagong |
| Inland transport | 5 | Chittagong port → Dhaka warehouse |
| Buffer | 4 | Weather delays, port congestion, documentation issues |
| **Total** | **52** | |

**Breakdown of Shipment Days (Air Route)**:

| Leg | Days | Detail |
|-----|------|--------|
| Factory to airport | 2 | Truck from factory to Shanghai airport |
| Air freight | 3 | Direct flight to Dhaka (DAC) |
| Customs at airport | 2 | Expedited clearance |
| Last mile | 1 | Airport → warehouse |
| **Total** | **8** | |

#### σ_LT (Lead Time Variability) Calculation

```python
# app/models/safety_stock_model.py

import math
import numpy as np
from typing import Optional


class SafetyStockModel:
    """
    Safety Stock calculator with BD-China supply chain awareness.
    """

    # Default lead time std devs when insufficient historical data
    DEFAULT_SIGMA_LT_SEA = 15.0   # days
    DEFAULT_SIGMA_LT_AIR = 5.0    # days
    MIN_ORDERS_FOR_SIGMA = 5      # minimum historical orders to compute σ_LT

    # Service level to safety factor mapping
    SERVICE_LEVEL_FACTORS = {
        0.90: 1.28,
        0.95: 1.65,
        0.975: 1.96,
        0.99: 2.33,
        0.999: 3.09,
    }

    def __init__(self, config: dict):
        self.default_review_period_days = config.get("review_period_days", 10)
        self.default_service_level = config.get("default_service_level", 0.95)

    def calculate(
        self,
        eoq: float,
        mae: float,
        mean_lead_time_days: float,
        lead_time_values: Optional[list[float]] = None,
        shipment_mode: str = "sea",
        service_level: Optional[float] = None,
        review_period_days: Optional[int] = None,
    ) -> dict:
        """
        Calculate safety stock using the comprehensive formula.

        SS = (EOQ / R) + (MAE × μₜ × σ_LT) × k

        Args:
            eoq: Economic Order Quantity (from Model 4).
            mae: Mean Absolute Error of forecast model (from backtest).
            mean_lead_time_days: Average lead time in days (μₜ).
            lead_time_values: List of historical actual lead times (for σ_LT calculation).
            shipment_mode: "sea" or "air" — used for default σ_LT fallback.
            service_level: Desired service level (0.90-0.999).
            review_period_days: Review period R in days.

        Returns:
            Dictionary with safety stock, reorder point, and all intermediate values.
        """
        if service_level is None:
            service_level = self.default_service_level
        if review_period_days is None:
            review_period_days = self.default_review_period_days

        # Calculate σ_LT
        sigma_lt = self._calculate_sigma_lt(
            lead_time_values=lead_time_values,
            shipment_mode=shipment_mode,
        )

        # Get safety factor k
        k = self._get_safety_factor(service_level)

        # Calculate safety stock components
        # Component 1: EOQ / R (cycle stock coverage during review period)
        component_cycle = eoq / review_period_days

        # Component 2: (MAE × μₜ × σ_LT) × k (demand + lead time uncertainty)
        component_uncertainty = (mae * mean_lead_time_days * sigma_lt) * k

        # Total safety stock
        safety_stock = component_cycle + component_uncertainty

        # Calculate reorder point
        # ROP = (daily_demand × lead_time) + safety_stock
        # We derive daily_demand from EOQ and review period
        daily_demand = eoq / review_period_days
        reorder_point = (daily_demand * mean_lead_time_days) + safety_stock

        return {
            "safety_stock": round(safety_stock),
            "reorder_point": round(reorder_point),
            "component_cycle_stock": round(component_cycle, 2),
            "component_uncertainty": round(component_uncertainty, 2),
            "sigma_lt_days": round(sigma_lt, 2),
            "safety_factor_k": k,
            "service_level": service_level,
            "daily_demand": round(daily_demand, 2),
            "lead_time_days": mean_lead_time_days,
            "inputs": {
                "eoq": eoq,
                "mae": mae,
                "mean_lead_time_days": mean_lead_time_days,
                "review_period_days": review_period_days,
                "shipment_mode": shipment_mode,
            },
        }

    def _calculate_sigma_lt(
        self,
        lead_time_values: Optional[list[float]],
        shipment_mode: str,
    ) -> float:
        """
        Calculate standard deviation of lead time.

        If we have sufficient historical data (≥ 5 orders), compute from actuals.
        Otherwise, use defaults based on shipment mode.
        """
        if lead_time_values and len(lead_time_values) >= self.MIN_ORDERS_FOR_SIGMA:
            return float(np.std(lead_time_values, ddof=1))  # Sample std dev

        # Fallback defaults
        if shipment_mode == "air":
            return self.DEFAULT_SIGMA_LT_AIR
        return self.DEFAULT_SIGMA_LT_SEA

    def _get_safety_factor(self, service_level: float) -> float:
        """
        Map service level to safety factor (z-score).
        Supports exact matches and linear interpolation between defined levels.
        """
        if service_level in self.SERVICE_LEVEL_FACTORS:
            return self.SERVICE_LEVEL_FACTORS[service_level]

        # Linear interpolation between the two nearest defined levels
        levels = sorted(self.SERVICE_LEVEL_FACTORS.keys())
        for i in range(len(levels) - 1):
            if levels[i] <= service_level <= levels[i + 1]:
                ratio = (service_level - levels[i]) / (levels[i + 1] - levels[i])
                return (
                    self.SERVICE_LEVEL_FACTORS[levels[i]]
                    + ratio * (
                        self.SERVICE_LEVEL_FACTORS[levels[i + 1]]
                        - self.SERVICE_LEVEL_FACTORS[levels[i]]
                    )
                )

        # Out of range — clamp
        if service_level < levels[0]:
            return self.SERVICE_LEVEL_FACTORS[levels[0]]
        return self.SERVICE_LEVEL_FACTORS[levels[-1]]
```

#### Safety Stock Example Calculation

| Input | Value |
|-------|-------|
| EOQ | 200 units |
| Review period (R) | 10 days |
| MAE (from backtest) | 12 units |
| Mean lead time (μₜ) | 152 days (sea) |
| σ_LT | 15 days |
| Service level | 95% → k = 1.65 |

$$SS = \frac{200}{10} + (12 \times 152 \times 15) \times 1.65 = 20 + 45{,}144 = 45{,}164$$

> **Note**: The `(MAE × μₜ × σ_LT)` term can produce very large values when lead times are long. In practice, the formula is often decomposed and the MAE is scaled to a daily rate. The production implementation includes a `normalize_mae_to_daily` flag (default: True) that divides MAE by 30 before the calculation, yielding more realistic safety stock values.

---

### 2.6 Model 6: Order Trigger Date Calculator (THE CORE IP)

> **This is the most valuable algorithm in the TrimedCast system.**
>
> It answers the most critical question in the BD–China motorcycle parts supply chain:
> **"On what exact date must we place this order to ensure stock doesn't run out before the next shipment arrives?"**
>
> This is non-trivial because:
> - Lead times are 3-5 months (sea) or 3.5 months (air)
> - Chinese New Year creates a ~30-day supply blackout every year
> - Demand is seasonal (winter parts peak in Nov-Feb)
> - Missing the order window means stockout for months (no quick reorder possible)

#### Algorithm — Step-by-Step

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   ORDER TRIGGER DATE CALCULATOR                         │
│                    Step-by-Step Algorithm                               │
└─────────────────────────────────────────────────────────────────────────┘

STEP 1: Calculate when stock will hit Reorder Point
──────────────────────────────────────────────────
  daily_consumption_rate = avg_demand_last_3_months / 90
  days_until_reorder = (qty_on_hand - reorder_point) / daily_consumption_rate
  reorder_hit_date = today + days_until_reorder

  ⚠️  If qty_on_hand <= reorder_point → ORDER IMMEDIATELY (already below ROP)

STEP 2: Calculate Total Lead Time
──────────────────────────────────
  if shipment_mode == 'sea':
      total_lt = mfg_days + sea_shipment_days + customs_days
  elif shipment_mode == 'air':
      total_lt = mfg_days + air_shipment_days + customs_days

  Add CNY buffer if order falls in CNY window:
  if does_date_fall_in_cny(order_trigger_date):
      total_lt += cny_buffer_days  (default: 10 days)

STEP 3: Calculate Order Trigger Date
──────────────────────────────────────
  order_trigger_date = reorder_hit_date - total_lt

  ⚠️  If order_trigger_date < today → ORDER IMMEDIATELY (already late)

STEP 4: Check CNY Risk
──────────────────────
  if order_trigger_date falls within CNY shutdown (Jan 20 — Feb 20):
      Option A: Order BEFORE CNY
          order_trigger_date = CNY_start - buffer_days
          → Avoids stockout but requires earlier cash outflow
      Option B: Order AFTER CNY
          order_trigger_date = CNY_end + 1
          → Delays order but risks stockout

      RECOMMENDATION: Option A if cash flow permits

STEP 5: Calculate Full Timeline
───────────────────────────────
  order_trigger_date          → Place order with supplier
  mfg_complete_date           → order_trigger_date + manufacturing_days
  ship_date                   → mfg_complete_date + 2 (packing/loading buffer)
  arrival_date                → ship_date + shipment_days
  customs_clearance_date      → arrival_date + customs_days
  available_for_sale_date     → customs_clearance_date + 1

OUTPUT: Complete order timeline with every milestone date
```

#### Implementation

```python
# app/models/order_trigger_model.py

from datetime import date, timedelta
from typing import Optional
from app.utils.cny_calendar import (
    does_date_fall_in_cny,
    adjust_for_cny,
    get_cny_shutdown_window,
    get_cny_buffer_days,
)


class OrderTriggerModel:
    """
    Order Trigger Date Calculator — THE CORE IP of TrimedCast.

    Determines the exact date an order must be placed to avoid stockout,
    accounting for BD-China supply chain lead times and CNY shutdowns.
    """

    # Default lead time components
    DEFAULT_MFG_DAYS = 90
    DEFAULT_SEA_SHIPMENT_DAYS = 52
    DEFAULT_AIR_SHIPMENT_DAYS = 8
    DEFAULT_CUSTOMS_DAYS_SEA = 10
    DEFAULT_CUSTOMS_DAYS_AIR = 3
    PACKING_BUFFER_DAYS = 2  # packing/loading after manufacturing

    def __init__(self, config: dict):
        self.default_mfg_days = config.get("manufacturing_lead_time_days", self.DEFAULT_MFG_DAYS)
        self.default_sea_shipment_days = config.get("sea_shipment_days", self.DEFAULT_SEA_SHIPMENT_DAYS)
        self.default_air_shipment_days = config.get("air_shipment_days", self.DEFAULT_AIR_SHIPMENT_DAYS)
        self.default_customs_days_sea = config.get("customs_clearance_days_sea", self.DEFAULT_CUSTOMS_DAYS_SEA)
        self.default_customs_days_air = config.get("customs_clearance_days_air", self.DEFAULT_CUSTOMS_DAYS_AIR)

    def calculate(
        self,
        qty_on_hand: float,
        reorder_point: float,
        daily_consumption_rate: float,
        shipment_mode: str = "sea",
        mfg_days: Optional[int] = None,
        shipment_days: Optional[int] = None,
        customs_days: Optional[int] = None,
        cny_strategy: str = "before",
        today: Optional[date] = None,
    ) -> dict:
        """
        Calculate the order trigger date and full order timeline.

        Args:
            qty_on_hand: Current quantity on hand.
            reorder_point: Reorder point (from Safety Stock model).
            daily_consumption_rate: Average daily demand (units/day).
            shipment_mode: "sea" or "air".
            mfg_days: Manufacturing lead time. Uses default if None.
            shipment_days: Shipping lead time. Uses default if None.
            customs_days: Customs clearance days. Uses default if None.
            cny_strategy: "before" (order before CNY) or "after" (order after CNY).
            today: Current date. Uses date.today() if None.

        Returns:
            Dictionary with order_trigger_date, full timeline, CNY risk assessment.
        """
        if today is None:
            today = date.today()

        # Resolve defaults
        if mfg_days is None:
            mfg_days = self.default_mfg_days
        if shipment_days is None:
            if shipment_mode == "sea":
                shipment_days = self.default_sea_shipment_days
            else:
                shipment_days = self.default_air_shipment_days
        if customs_days is None:
            if shipment_mode == "sea":
                customs_days = self.default_customs_days_sea
            else:
                customs_days = self.default_customs_days_air

        # ─── STEP 1: Calculate when stock will hit Reorder Point ───
        if qty_on_hand <= reorder_point:
            # Already at or below ROP → ORDER IMMEDIATELY
            step1 = {
                "order_urgent": True,
                "days_until_reorder": 0,
                "reorder_hit_date": today,
                "message": "Stock is at or below reorder point. ORDER IMMEDIATELY.",
            }
            reorder_hit_date = today
        else:
            if daily_consumption_rate <= 0:
                raise ValueError("daily_consumption_rate must be positive")
            days_until_reorder = (qty_on_hand - reorder_point) / daily_consumption_rate
            reorder_hit_date = today + timedelta(days=round(days_until_reorder))
            step1 = {
                "order_urgent": False,
                "days_until_reorder": round(days_until_reorder, 1),
                "reorder_hit_date": reorder_hit_date,
                "message": f"Stock will hit ROP in {days_until_reorder:.1f} days.",
            }

        # ─── STEP 2: Calculate Total Lead Time ───
        total_lt = mfg_days + shipment_days + customs_days

        # ─── STEP 3: Calculate Order Trigger Date ───
        order_trigger_date = reorder_hit_date - timedelta(days=total_lt)

        # Check if already past trigger date
        order_immediately = order_trigger_date <= today
        if order_immediately:
            order_trigger_date = today
            step3_message = "Order trigger date has already passed. ORDER IMMEDIATELY."
        else:
            days_until_order = (order_trigger_date - today).days
            step3_message = f"Order should be placed on {order_trigger_date} ({days_until_order} days from now)."

        # ─── STEP 4: Check CNY Risk ───
        cny_result = adjust_for_cny(
            proposed_order_date=order_trigger_date,
            year=order_trigger_date.year,
            strategy=cny_strategy,
        )

        if cny_result["cny_risk"]:
            order_trigger_date = cny_result["adjusted_date"]
            # Add CNY buffer to total lead time
            cny_buffer = get_cny_buffer_days(order_trigger_date.year)
            total_lt += cny_buffer

        # ─── STEP 5: Calculate Full Timeline ───
        timeline = self._build_timeline(
            order_trigger_date=order_trigger_date,
            mfg_days=mfg_days,
            shipment_days=shipment_days,
            customs_days=customs_days,
        )

        return {
            # Primary output
            "order_trigger_date": order_trigger_date,
            "order_immediately": order_immediately or cny_result.get("cny_risk", False),
            "total_lead_time_days": total_lt,

            # Detailed steps
            "step1_stock_analysis": step1,
            "step2_lead_time": {
                "mfg_days": mfg_days,
                "shipment_days": shipment_days,
                "customs_days": customs_days,
                "total_lt_days": mfg_days + shipment_days + customs_days,
                "shipment_mode": shipment_mode,
            },
            "step3_trigger_date": {
                "calculated_date": reorder_hit_date - timedelta(days=total_lt),
                "message": step3_message,
            },
            "step4_cny_analysis": cny_result,

            # Complete timeline
            "timeline": timeline,

            # Inputs
            "inputs": {
                "qty_on_hand": qty_on_hand,
                "reorder_point": reorder_point,
                "daily_consumption_rate": daily_consumption_rate,
                "today": today,
            },
        }

    def _build_timeline(
        self,
        order_trigger_date: date,
        mfg_days: int,
        shipment_days: int,
        customs_days: int,
    ) -> dict:
        """
        Build the complete order timeline with every milestone date.
        """
        mfg_complete_date = order_trigger_date + timedelta(days=mfg_days)
        ship_date = mfg_complete_date + timedelta(days=self.PACKING_BUFFER_DAYS)
        arrival_date = ship_date + timedelta(days=shipment_days)
        customs_clearance_date = arrival_date + timedelta(days=customs_days)
        available_for_sale_date = customs_clearance_date + timedelta(days=1)

        return {
            "order_trigger_date": order_trigger_date,
            "mfg_complete_date": mfg_complete_date,
            "ship_date": ship_date,
            "arrival_date": arrival_date,
            "customs_clearance_date": customs_clearance_date,
            "available_for_sale_date": available_for_sale_date,
            "milestones": [
                {
                    "date": order_trigger_date,
                    "event": "Place order with supplier",
                    "action": "Send purchase order to Chinese supplier",
                },
                {
                    "date": mfg_complete_date,
                    "event": "Manufacturing complete",
                    "action": "Confirm production completion; arrange QC inspection",
                },
                {
                    "date": ship_date,
                    "event": "Ship from supplier",
                    "action": "Confirm shipment; receive BL/tracking number",
                },
                {
                    "date": arrival_date,
                    "event": "Arrive at BD port",
                    "action": "Initiate customs clearance; submit import documents",
                },
                {
                    "date": customs_clearance_date,
                    "event": "Customs cleared",
                    "action": "Arrange inland transport to warehouse",
                },
                {
                    "date": available_for_sale_date,
                    "event": "Available for sale",
                    "action": "Update inventory system; list on sales channels",
                },
            ],
        }
```

#### Order Trigger Example (Full Timeline)

**Scenario**: A Dhaka motorcycle parts dealer needs to restock fog lamps before winter.

| Input | Value |
|-------|-------|
| qty_on_hand | 150 units |
| reorder_point | 80 units |
| daily_consumption_rate | 2.5 units/day (winter approaching) |
| shipment_mode | sea |
| mfg_days | 90 |
| shipment_days | 52 |
| customs_days | 10 |
| today | 2025-06-01 |

**Calculation**:

| Step | Calculation | Result |
|------|-------------|--------|
| Days until ROP | (150 - 80) / 2.5 | 28 days |
| Reorder hit date | 2025-06-01 + 28 days | 2025-06-29 |
| Total lead time | 90 + 52 + 10 | 152 days |
| Order trigger date | 2025-06-29 - 152 days | **2025-01-29** |
| CNY check | 2025-01-29 is in CNY window (Jan 20 - Feb 20)? | **YES — CNY RISK** |
| CNY adjustment (before) | Jan 20 - 10 buffer - 1 | **2025-01-09** |

**Full Timeline**:

| Milestone | Date | Days from Now |
|-----------|------|---------------|
| Place order | **2025-01-09** | -142 (retroactive — ORDER IS LATE) |
| Manufacturing complete | 2025-04-09 | -42 |
| Ship from supplier | 2025-04-11 | -40 |
| Arrive at BD port | 2025-06-02 | +1 |
| Customs cleared | 2025-06-12 | +11 |
| Available for sale | 2025-06-13 | +12 |

> **ALERT**: The order trigger date is in the past. The system flags this as **"ORDER IMMEDIATELY"** — the dealer is already behind the optimal ordering window and risks stockout.

---

## Section 3: Consensus Forecast Logic

### 3.1 Overview

The Consensus Forecast is TrimedCast's approach to combining multiple quantitative models with qualitative human intelligence into a **Single Set of Numbers** — the final forecast that drives all purchasing and inventory decisions.

### 3.2 Consensus Forecast Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONSENSUS FORECAST PIPELINE                          │
│                                                                         │
│  Step 1: Prophet Seasonal Forecast (quantitative baseline)              │
│     ↓                                                                   │
│  Step 2: Apply BD Seasonal Weights (per-SKU seasonal multipliers)       │
│     ↓                                                                   │
│  Step 3: Apply Marketing Adjustments (promo_index → β₂ adjustment)      │
│     ↓                                                                   │
│  Step 4: Apply Sales Field Intelligence (manual overrides + audit)      │
│     ↓                                                                   │
│  Step 5: Consensus Forecast = "Single Set of Numbers"                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Step-by-Step Detail

#### Step 1: Prophet Seasonal Forecast (Quantitative Baseline)

The Prophet model output serves as the starting point. This is the pure statistical forecast incorporating:
- Historical demand patterns
- BD seasonal effects (winter, monsoon, pre-winter)
- BD holiday effects (Eid, Puja, etc.)
- Trend and changepoints

```
prophet_forecast[month] = yhat value from Prophet model
```

#### Step 2: Apply BD Seasonal Weights

Each SKU has seasonal weight multipliers defined by the tenant (with sensible defaults). These capture product-specific seasonal patterns that Prophet's general seasonality may not fully represent.

| Month | Default Weight | Cold Weather Parts | Off-Road Parts | Street Parts |
|-------|---------------|--------------------|----------------|-------------|
| Jan | 1.2 | 1.8 | 0.8 | 0.7 |
| Feb | 1.1 | 1.5 | 0.8 | 0.8 |
| Mar | 1.0 | 1.0 | 0.9 | 1.0 |
| Apr | 1.0 | 0.7 | 0.9 | 1.1 |
| May | 0.9 | 0.5 | 1.0 | 1.0 |
| Jun | 0.8 | 0.3 | 1.3 | 0.7 |
| Jul | 0.8 | 0.3 | 1.4 | 0.6 |
| Aug | 0.8 | 0.3 | 1.3 | 0.7 |
| Sep | 0.9 | 0.4 | 1.2 | 0.8 |
| Oct | 1.1 | 0.8 | 1.0 | 1.1 |
| Nov | 1.2 | 1.6 | 0.9 | 1.0 |
| Dec | 1.3 | 2.0 | 0.8 | 0.8 |

```
after_seasonal[month] = prophet_forecast[month] × seasonal_weight[month][sku_category]
```

#### Step 3: Apply Marketing Adjustments

The regression model's promo coefficient (β₂) is used to adjust the forecast based on planned promotional activity.

```
promo_adjustment = β₂ × (planned_promo_index - baseline_promo_index)
after_marketing[month] = after_seasonal[month] + promo_adjustment
```

Where:
- `planned_promo_index`: The marketing team's planned promo intensity for the forecast month (0.0 - 1.0)
- `baseline_promo_index`: The average promo_index from the historical training data

#### Step 4: Apply Sales Field Intelligence

Sales representatives who visit dealers daily have ground-level intelligence that statistical models cannot capture:
- A dealer is expanding to a second location (demand increase)
- A competitor's supply is disrupted (demand shift)
- A new government regulation is coming (demand spike or drop)
- A local event (rally, fair) will temporarily boost demand

This is captured as a **manual override** with mandatory audit trail:

```python
# Manual override schema
{
    "sku_id": "SKU-12345",
    "month": "2025-07",
    "override_qty": 500,          # Sales rep's estimate
    "reason_code": "COMPETITOR_OOS",  # From enum: COMPETITOR_OOS, NEW_DEALER, REGULATION, EVENT, OTHER
    "reason_text": "Main competitor (X Parts) has factory issue, expect demand shift",
    "submitted_by": "user_id_456",
    "submitted_at": "2025-06-15T10:30:00Z",
    "confidence_level": "medium",  # low, medium, high
}
```

**Override blending logic**:

| Confidence Level | Blend Weight | Formula |
|-----------------|-------------|---------|
| low | 0.2 | `consensus = 0.8 × statistical + 0.2 × override` |
| medium | 0.4 | `consensus = 0.6 × statistical + 0.4 × override` |
| high | 0.7 | `consensus = 0.3 × statistical + 0.7 × override` |

If no override exists for a SKU-month, Step 4 is skipped and the statistical forecast is used as-is.

#### Step 5: Final Consensus Forecast

```
consensus_forecast[month] = after_marketing[month]  (if no override)
consensus_forecast[month] = blended_value            (if override exists)
```

This is the **"Single Set of Numbers"** — the final forecast that:
- Drives EOQ and safety stock calculations
- Determines order trigger dates
- Feeds the dashboard and reports
- Is used in S&OP (Sales & Operations Planning) meetings

### 3.4 Implementation

```python
# app/models/consensus_model.py

import pandas as pd
from typing import Optional


class ConsensusModel:
    """
    Consensus Forecast combiner — produces the Single Set of Numbers.
    """

    OVERRIDE_BLEND_WEIGHTS = {
        "low": 0.2,
        "medium": 0.4,
        "high": 0.7,
    }

    def calculate(
        self,
        prophet_forecast: dict,
        seasonal_weights: dict,
        promo_coefficient_beta2: float,
        planned_promo_index: float,
        baseline_promo_index: float,
        manual_overrides: Optional[list[dict]] = None,
    ) -> dict:
        """
        Calculate the consensus forecast.

        Args:
            prophet_forecast: Dict with month keys and yhat values.
            seasonal_weights: Dict with month keys and weight values for the SKU category.
            promo_coefficient_beta2: β₂ from regression model.
            planned_promo_index: Marketing's planned promo intensity (0.0-1.0).
            baseline_promo_index: Average historical promo_index.
            manual_overrides: List of manual override dicts (from Step 4).

        Returns:
            Dictionary with consensus forecast, step-by-step breakdown, and audit trail.
        """
        consensus = {}
        breakdown = []

        # Build override lookup: (sku_id, month) → override dict
        override_lookup = {}
        if manual_overrides:
            for ov in manual_overrides:
                key = (ov.get("sku_id"), ov.get("month"))
                override_lookup[key] = ov

        for month, prophet_value in prophet_forecast.items():
            # Step 1: Prophet baseline
            step1_value = prophet_value

            # Step 2: Apply seasonal weight
            weight = seasonal_weights.get(month, 1.0)
            step2_value = step1_value * weight

            # Step 3: Apply marketing adjustment
            promo_delta = planned_promo_index - baseline_promo_index
            promo_adjustment = promo_coefficient_beta2 * promo_delta
            step3_value = step2_value + promo_adjustment

            # Step 4: Apply manual override (if exists)
            override = override_lookup.get((None, month))  # Simplified; real impl uses sku_id
            if override:
                confidence = override.get("confidence_level", "medium")
                blend_weight = self.OVERRIDE_BLEND_WEIGHTS.get(confidence, 0.4)
                statistical_weight = 1.0 - blend_weight

                step4_value = (
                    statistical_weight * step3_value
                    + blend_weight * override["override_qty"]
                )
                override_applied = True
            else:
                step4_value = step3_value
                override_applied = False

            # Step 5: Final consensus
            consensus[month] = round(step4_value)
            breakdown.append({
                "month": month,
                "step1_prophet": round(step1_value, 2),
                "step2_after_seasonal": round(step2_value, 2),
                "seasonal_weight_used": weight,
                "step3_after_marketing": round(step3_value, 2),
                "promo_adjustment": round(promo_adjustment, 2),
                "step4_after_override": round(step4_value, 2),
                "override_applied": override_applied,
                "consensus_forecast": round(step4_value),
            })

        return {
            "consensus_forecast": consensus,
            "breakdown": breakdown,
            "total_override_count": len(override_lookup),
        }
```

---

## Section 4: Error Metrics & Auto-Recalibration

### 4.1 Metrics (Computed on Backtest Against Actuals)

| Metric | Formula | Python Implementation | Purpose | Alert Threshold |
|--------|---------|----------------------|---------|-----------------|
| **MAPE** | $\frac{1}{n} \sum_{i=1}^{n} \frac{\|A_i - F_i\|}{A_i} \times 100$ | `sklearn.metrics.mean_absolute_percentage_error` | Relative accuracy — easy to communicate to business users | > 10% |
| **MAE** | $\frac{1}{n} \sum_{i=1}^{n} \|A_i - F_i\|$ | `sklearn.metrics.mean_absolute_error` | Average error magnitude in units | > historical σ |
| **MSE** | $\frac{1}{n} \sum_{i=1}^{n} (A_i - F_i)^2$ | `sklearn.metrics.mean_squared_error` | Penalizes large outliers heavily | — |
| **RMSE** | $\sqrt{MSE}$ | `sklearn.metrics.root_mean_squared_error` | Standard deviation of residuals; same unit as data | > 1.15 × MAE |
| **Bias** | $\frac{1}{n} \sum_{i=1}^{n} (A_i - F_i)$ | Custom | Systematic over/under forecasting | \|Bias\| > 0.1 × MAE |

#### Metric Interpretation Guide

| MAPE Range | Rating | Action |
|------------|--------|--------|
| 0% – 5% | Excellent | No action needed |
| 5% – 10% | Good | Monitor; acceptable for production use |
| 10% – 20% | Fair | Auto-recalibration triggered; investigate causes |
| 20% – 50% | Poor | Manual review required; model may be fundamentally wrong for this SKU |
| > 50% | Unusable | Disable automated ordering for this SKU; manual planning only |

#### Implementation

```python
# app/utils/metrics.py

import numpy as np
from sklearn.metrics import (
    mean_absolute_error,
    mean_absolute_percentage_error,
    mean_squared_error,
)


def calculate_all_metrics(actuals: np.ndarray, forecasts: np.ndarray) -> dict:
    """
    Calculate all forecast error metrics.

    Args:
        actuals: Array of actual demand values.
        forecasts: Array of forecasted demand values.

    Returns:
        Dictionary with all metrics and their interpretations.
    """
    actuals = np.array(actuals, dtype=float)
    forecasts = np.array(forecasts, dtype=float)

    # Core metrics
    mae = mean_absolute_error(actuals, forecasts)
    mse = mean_squared_error(actuals, forecasts)
    rmse = np.sqrt(mse)

    # MAPE: Handle zero actuals (skip or use epsilon)
    non_zero_mask = actuals != 0
    if non_zero_mask.any():
        mape = mean_absolute_percentage_error(
            actuals[non_zero_mask], forecasts[non_zero_mask]
        ) * 100
    else:
        mape = float("inf")

    # Bias (systematic over/under forecasting)
    bias = np.mean(actuals - forecasts)

    # Historical standard deviation (for MAE comparison)
    historical_std = np.std(actuals, ddof=1)

    # Alert flags
    alerts = []
    if mape > 10:
        alerts.append({
            "level": "warning",
            "metric": "MAPE",
            "value": round(mape, 2),
            "threshold": 10,
            "message": f"MAPE ({mape:.1f}%) exceeds 10% threshold. Auto-recalibration recommended.",
        })

    if rmse > 1.15 * mae:
        alerts.append({
            "level": "warning",
            "metric": "RMSE/MAE ratio",
            "value": round(rmse / mae, 3),
            "threshold": 1.15,
            "message": f"RMSE/MAE ratio ({rmse/mae:.2f}) > 1.15. Large outliers detected. Manual review recommended.",
        })

    if mae > historical_std:
        alerts.append({
            "level": "critical",
            "metric": "MAE vs σ",
            "value": round(mae, 2),
            "threshold": round(historical_std, 2),
            "message": f"MAE ({mae:.1f}) > historical σ ({historical_std:.1f}). Forecast is less accurate than using the historical average.",
        })

    # MAPE interpretation
    if mape <= 5:
        rating = "excellent"
    elif mape <= 10:
        rating = "good"
    elif mape <= 20:
        rating = "fair"
    elif mape <= 50:
        rating = "poor"
    else:
        rating = "unusable"

    return {
        "mape": round(mape, 4),
        "mae": round(mae, 4),
        "mse": round(mse, 4),
        "rmse": round(rmse, 4),
        "bias": round(bias, 4),
        "historical_std": round(historical_std, 4),
        "mape_rating": rating,
        "alerts": alerts,
        "n_observations": len(actuals),
    }
```

### 4.2 Auto-Recalibration Triggers

The system monitors forecast accuracy on a **weekly cadence** (S&OE — Sales & Operations Execution rhythm) and triggers recalibration when error thresholds are breached.

| Trigger | Condition | Auto-Action | Manual Follow-up |
|---------|-----------|-------------|------------------|
| High MAPE | MAPE > 10% | Re-run exponential smoothing with auto-tuned alpha; re-fit Prophet with adjusted changepoint_prior_scale | Review SKU for structural demand change |
| Outlier Dominance | RMSE > 1.15 × MAE | Flag SKU in dashboard; increase outlier_sigma_threshold | Investigate specific outlier months (one-time event? data error?) |
| Worse Than Average | MAE > historical σ | Revert to simple moving average for this SKU; flag for audit | Determine if regression/Prophet is appropriate for this SKU |
| Systematic Bias | \|Bias\| > 0.1 × MAE | Apply bias correction factor to future forecasts | Investigate root cause (new market entrant, regulation change) |

#### Recalibration Implementation

```python
# app/services/recalibration_service.py

import structlog
from app.models.prophet_model import ProphetModel
from app.models.exp_smoothing_model import ExponentialSmoothingModel
from app.utils.metrics import calculate_all_metrics

logger = structlog.get_logger()


class RecalibrationService:
    """
    Auto-recalibration service. Runs on weekly cadence.
    """

    def __init__(self, config: dict):
        self.prophet_model = ProphetModel(config)
        self.exp_smoothing_model = ExponentialSmoothingModel(config)
        self.mape_threshold = config.get("mape_threshold", 10.0)
        self.rmse_mae_ratio_threshold = config.get("rmse_mae_ratio_threshold", 1.15)

    async def run_recalibration(
        self,
        tenant_id: int,
        sku_id: str,
        actuals: list[float],
        forecasts: list[float],
        historical_data: "pd.DataFrame",
        current_config: dict,
    ) -> dict:
        """
        Run recalibration checks and apply auto-corrections.

        Args:
            tenant_id: The tenant identifier.
            sku_id: The SKU being evaluated.
            actuals: Recent actual demand values.
            forecasts: Corresponding forecast values.
            historical_data: Full historical data for re-fitting.
            current_config: Current model configuration.

        Returns:
            Dictionary with recalibration actions taken and new config.
        """
        import numpy as np

        metrics = calculate_all_metrics(
            np.array(actuals), np.array(forecasts)
        )

        actions_taken = []
        new_config = current_config.copy()

        # Trigger 1: High MAPE → auto-tune alpha and re-fit Prophet
        if metrics["mape"] > self.mape_threshold:
            logger.warning(
                "recalibration_triggered",
                trigger="high_mape",
                tenant_id=tenant_id,
                sku_id=sku_id,
                mape=metrics["mape"],
                threshold=self.mape_threshold,
            )

            # Auto-tune exponential smoothing alpha
            exp_result = self.exp_smoothing_model.fit_predict(
                series=historical_data["qty_sold"],
                forecast_periods=6,
                alpha=None,  # Force auto-tune
            )

            # Adjust Prophet changepoint flexibility
            # Higher MAPE → more flexible trend (allow more changepoints)
            adjusted_cps = min(
                current_config.get("prophet_changepoint_prior_scale", 0.05) * 1.5,
                0.5,  # Cap at 0.5 to prevent overfitting
            )
            new_config["prophet_changepoint_prior_scale"] = adjusted_cps
            new_config["default_alpha"] = exp_result["alpha"]

            actions_taken.append({
                "trigger": "high_mape",
                "action": "auto_tune_alpha_and_prophet_cps",
                "old_alpha": current_config.get("default_alpha", 0.3),
                "new_alpha": exp_result["alpha"],
                "old_cps": current_config.get("prophet_changepoint_prior_scale", 0.05),
                "new_cps": adjusted_cps,
            })

        # Trigger 2: Outlier dominance → increase sigma threshold
        if metrics["rmse"] > self.rmse_mae_ratio_threshold * metrics["mae"]:
            old_sigma = current_config.get("outlier_sigma_threshold", 3.0)
            new_sigma = old_sigma + 0.5  # More permissive

            new_config["outlier_sigma_threshold"] = min(new_sigma, 5.0)

            actions_taken.append({
                "trigger": "outlier_dominance",
                "action": "increase_sigma_threshold",
                "old_sigma": old_sigma,
                "new_sigma": new_config["outlier_sigma_threshold"],
            })

        # Trigger 3: Worse than average → flag for audit
        if metrics["mae"] > metrics["historical_std"]:
            actions_taken.append({
                "trigger": "worse_than_average",
                "action": "flag_for_audit",
                "mae": metrics["mae"],
                "historical_std": metrics["historical_std"],
                "recommendation": "Consider reverting to simple moving average for this SKU.",
            })

        return {
            "tenant_id": tenant_id,
            "sku_id": sku_id,
            "metrics": metrics,
            "actions_taken": actions_taken,
            "new_config": new_config,
            "recalibration_needed": len(actions_taken) > 0,
        }
```

### 4.3 Backtest Methodology

#### Train/Test Split

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKTEST METHODOLOGY                          │
│                                                                  │
│  Historical Data: |████████████████████████████|████████████|    │
│                    ←--- Training (80%) ---→←-- Test (20%) --→    │
│                                                                  │
│  Rolling Origin Evaluation:                                      │
│  ┌──────────────────────┐ ┌────┐                                │
│  │ Train: months 1-24   │ │T:25│  → Calculate metrics          │
│  └──────────────────────┘ └────┘                                │
│    ┌──────────────────────┐ ┌────┐                              │
│    │ Train: months 2-25   │ │T:26│  → Calculate metrics        │
│    └──────────────────────┘ └────┘                              │
│      ┌──────────────────────┐ ┌────┐                            │
│      │ Train: months 3-26   │ │T:27│  → Calculate metrics      │
│      └──────────────────────┘ └────┘                            │
│        ...                                                       │
│  Aggregate metrics across all rolling windows                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Implementation

```python
# app/services/backtest_service.py

import numpy as np
import pandas as pd
from typing import Optional
from app.utils.metrics import calculate_all_metrics


class BacktestService:
    """
    Backtest runner with rolling origin evaluation.
    """

    def __init__(self, config: dict):
        self.default_train_pct = config.get("backtest_train_pct", 0.80)
        self.rolling_window_months = config.get("backtest_rolling_window_months", 12)

    async def run_backtest(
        self,
        tenant_id: int,
        product_id: str,
        model_type: str,  # "prophet", "regression", "exp_smoothing", "all"
        historical_data: pd.DataFrame,
        train_pct: Optional[float] = None,
    ) -> dict:
        """
        Run backtest with rolling origin evaluation.

        Args:
            tenant_id: Tenant identifier.
            product_id: Product/SKU identifier.
            model_type: Which model(s) to backtest.
            historical_data: DataFrame with [date, qty_sold, price, promo_index].
            train_pct: Training data percentage. Default 0.80.

        Returns:
            Dictionary with backtest results for each model.
        """
        if train_pct is None:
            train_pct = self.default_train_pct

        results = {}

        if model_type in ("prophet", "all"):
            results["prophet"] = self._backtest_prophet(
                historical_data, train_pct
            )

        if model_type in ("regression", "all"):
            results["regression"] = self._backtest_regression(
                historical_data, train_pct
            )

        if model_type in ("exp_smoothing", "all"):
            results["exp_smoothing"] = self._backtest_exp_smoothing(
                historical_data, train_pct
            )

        # Determine best model by MAPE
        best_model = min(
            results.keys(),
            key=lambda k: results[k].get("mape", float("inf")),
        )

        return {
            "tenant_id": tenant_id,
            "product_id": product_id,
            "train_pct": train_pct,
            "results_by_model": results,
            "best_model": best_model,
            "best_mape": results[best_model].get("mape", None),
            "total_data_points": len(historical_data),
            "rolling_windows_evaluated": self.rolling_window_months,
        }

    def _backtest_exp_smoothing(
        self, df: pd.DataFrame, train_pct: float
    ) -> dict:
        """
        Backtest exponential smoothing with rolling origin.
        """
        from app.models.exp_smoothing_model import ExponentialSmoothingModel

        values = df["qty_sold"].values
        split_idx = int(len(values) * train_pct)

        all_mapes = []
        best_alpha_overall = 0.3

        # Rolling origin evaluation
        for offset in range(0, min(self.rolling_window_months, len(values) - split_idx)):
            train_end = split_idx + offset
            test_end = min(train_end + 1, len(values))

            if test_end >= len(values):
                break

            train = pd.Series(values[:train_end])
            test_actual = values[train_end:test_end]

            model = ExponentialSmoothingModel({"exp_smoothing_auto_tune": True})
            result = model.fit_predict(train, forecast_periods=len(test_actual))

            test_forecast = np.full(len(test_actual), result["last_smoothed_value"])

            metrics = calculate_all_metrics(test_actual, test_forecast)
            all_mapes.append(metrics["mape"])

            if result["auto_tuned"]:
                best_alpha_overall = result["alpha"]

        avg_mape = np.mean(all_mapes) if all_mapes else float("inf")

        # Final single-split backtest for full metrics
        train = pd.Series(values[:split_idx])
        test = values[split_idx:]
        model = ExponentialSmoothingModel({"exp_smoothing_auto_tune": True})
        result = model.fit_predict(train, forecast_periods=len(test))
        forecast = np.full(len(test), result["last_smoothed_value"])
        final_metrics = calculate_all_metrics(test, forecast)

        return {
            "mape": round(avg_mape, 4),
            "mae": final_metrics["mae"],
            "mse": final_metrics["mse"],
            "rmse": final_metrics["rmse"],
            "best_alpha": best_alpha_overall,
            "rolling_avg_mape": round(avg_mape, 4),
        }

    def _backtest_prophet(self, df: pd.DataFrame, train_pct: float) -> dict:
        """Backtest Prophet model. (Implementation analogous to exp_smoothing.)"""
        # ... Prophet backtest implementation ...
        pass

    def _backtest_regression(self, df: pd.DataFrame, train_pct: float) -> dict:
        """Backtest regression model. (Implementation analogous to exp_smoothing.)"""
        # ... Regression backtest implementation ...
        pass
```

---

## Section 5: Python FastAPI — API Endpoints

### 5.1 Health Check

```
GET /health
```

**Response**:

```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime_seconds": 86400,
  "redis_connected": true,
  "postgres_connected": true,
  "worker_processes": 4,
  "queue_depth": 12
}
```

**Implementation**:

```python
# app/api/routes/health.py

from fastapi import APIRouter
from app.db.connection import check_db_health
from app.config import settings

router = APIRouter()


@router.get("/health")
async def health_check():
    db_ok = await check_db_health()

    return {
        "status": "ok" if db_ok else "degraded",
        "version": settings.APP_VERSION,
        "uptime_seconds": settings.uptime_seconds,
        "redis_connected": settings.redis_connected,
        "postgres_connected": db_ok,
        "worker_processes": settings.WORKER_PROCESSES,
        "queue_depth": settings.current_queue_depth,
    }
```

---

### 5.2 Run Forecast

```
POST /forecast/run
```

**Request Schema**:

```python
# app/api/schemas/forecast.py

from pydantic import BaseModel, Field
from typing import Optional


class ForecastRunRequest(BaseModel):
    tenant_id: int = Field(..., gt=0, description="Tenant identifier")
    product_ids: list[int] = Field(
        ..., min_length=1, max_length=500,
        description="List of product IDs to forecast (max 500 per batch)"
    )
    season: str = Field(
        ..., pattern="^(winter|monsoon|pre_winter|summer|all)$",
        description="BD season context"
    )
    forecast_horizon_months: int = Field(
        default=6, ge=1, le=24,
        description="Number of months to forecast ahead"
    )
    method_override: Optional[str] = Field(
        default=None,
        pattern="^(prophet|regression|exp_smoothing|consensus)$",
        description="Override default forecast method"
    )
    include_backtest: bool = Field(
        default=False,
        description="Run backtest alongside forecast"
    )
    priority: str = Field(
        default="normal",
        pattern="^(low|normal|high|urgent)$",
        description="Job priority level"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "tenant_id": 1,
                "product_ids": [101, 102, 103],
                "season": "winter",
                "forecast_horizon_months": 6,
                "method_override": "consensus",
                "include_backtest": True,
                "priority": "normal",
            }
        }


class ForecastRunResponse(BaseModel):
    job_id: str = Field(..., description="Unique job identifier (UUID)")
    status: str = Field(default="queued", description="Job status")
    tenant_id: int
    product_count: int = Field(..., description="Number of products in batch")
    estimated_completion_seconds: Optional[int] = Field(
        default=None, description="Estimated time to completion"
    )
    queued_at: str = Field(..., description="ISO 8601 timestamp")
```

**Example Request**:

```bash
curl -X POST http://forecasting-service:8000/forecast/run \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: 1" \
  -d '{
    "tenant_id": 1,
    "product_ids": [101, 102, 103, 104, 105],
    "season": "winter",
    "forecast_horizon_months": 6,
    "method_override": "consensus",
    "include_backtest": true,
    "priority": "normal"
  }'
```

**Example Response**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "queued",
  "tenant_id": 1,
  "product_count": 5,
  "estimated_completion_seconds": 25,
  "queued_at": "2025-03-04T10:30:00Z"
}
```

---

### 5.3 Get Forecast Status

```
GET /forecast/status/{job_id}
```

**Path Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| job_id | string (UUID) | Job identifier from POST /forecast/run |

**Response Schema**:

```python
class ForecastStatusResponse(BaseModel):
    job_id: str
    status: str = Field(
        description="One of: queued, running, completed, failed, cancelled"
    )
    progress_pct: float = Field(
        ge=0, le=100, description="Progress percentage"
    )
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    results: Optional[dict] = Field(
        default=None,
        description="Forecast results (populated when status=completed)"
    )
```

**Example Response (In Progress)**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "progress_pct": 60.0,
  "started_at": "2025-03-04T10:30:05Z",
  "completed_at": null,
  "error_message": null,
  "results": null
}
```

**Example Response (Completed)**:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress_pct": 100.0,
  "started_at": "2025-03-04T10:30:05Z",
  "completed_at": "2025-03-04T10:30:28Z",
  "error_message": null,
  "results": {
    "products_forecasted": 5,
    "method_used": "consensus",
    "forecast_horizon_months": 6,
    "avg_mape": 7.2,
    "avg_mae": 14.5,
    "sku_results": [
      {
        "product_id": 101,
        "product_name": "Fog Lamp Assembly H4",
        "consensus_forecast": {
          "2025-04": 120,
          "2025-05": 95,
          "2025-06": 80,
          "2025-07": 65,
          "2025-08": 70,
          "2025-09": 90
        },
        "eoq": 200,
        "safety_stock": 45,
        "reorder_point": 85,
        "order_trigger_date": "2025-04-15",
        "mape": 6.8,
        "cny_risk": false
      }
    ]
  }
}
```

---

### 5.4 Calculate EOQ

```
POST /calculate/eoq
```

**Request Schema**:

```python
class EOQRequest(BaseModel):
    product_id: int = Field(..., gt=0)
    forecasted_demand: float = Field(..., gt=0, description="Annual forecasted demand in units")
    unit_cost: float = Field(..., gt=0, description="Purchase price per unit in BDT")
    ordering_cost: Optional[float] = Field(
        default=None, gt=0, description="Cost per purchase order in BDT"
    )
    holding_cost_pct: Optional[float] = Field(
        default=None, gt=0, lt=1, description="Holding cost as fraction of unit cost"
    )
    max_stock_qty: Optional[int] = Field(
        default=None, gt=0, description="Maximum stock quantity for this product"
    )
    supplier_moq: Optional[int] = Field(
        default=None, gt=0, description="Supplier Minimum Order Quantity"
    )
    warehouse_capacity_remaining: Optional[int] = Field(
        default=None, ge=0, description="Remaining warehouse capacity in units"
    )
```

**Example Request**:

```bash
curl -X POST http://forecasting-service:8000/calculate/eoq \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 101,
    "forecasted_demand": 1200,
    "unit_cost": 150.0,
    "ordering_cost": 500.0,
    "holding_cost_pct": 0.20,
    "max_stock_qty": 500,
    "supplier_moq": 50
  }'
```

**Example Response**:

```json
{
  "product_id": 101,
  "eoq": 200,
  "eoq_unconstrained": 200,
  "reorder_point": 85,
  "safety_stock": 45,
  "recommended_order_qty": 200,
  "holding_cost_per_unit_bdt": 30.0,
  "orders_per_year": 6.0,
  "order_cycle_days": 60.8,
  "total_ordering_cost_bdt": 3000.0,
  "total_holding_cost_bdt": 3000.0,
  "total_inventory_cost_bdt": 6000.0,
  "constraints_applied": []
}
```

---

### 5.5 Calculate Order Trigger

```
POST /calculate/order-trigger
```

**Request Schema**:

```python
class OrderTriggerRequest(BaseModel):
    product_id: int = Field(..., gt=0)
    current_stock: float = Field(..., ge=0, description="Current quantity on hand")
    daily_consumption_rate: float = Field(
        ..., gt=0, description="Average daily demand in units/day"
    )
    reorder_point: float = Field(..., ge=0, description="Reorder point in units")
    shipment_mode: str = Field(
        default="sea", pattern="^(sea|air)$",
        description="Shipment mode"
    )
    mfg_days: Optional[int] = Field(
        default=None, gt=0, description="Manufacturing lead time in days"
    )
    shipment_days: Optional[int] = Field(
        default=None, gt=0, description="Shipment lead time in days"
    )
    customs_days: Optional[int] = Field(
        default=None, gt=0, description="Customs clearance days"
    )
    cny_start: Optional[str] = Field(
        default=None, description="CNY shutdown start date (YYYY-MM-DD)"
    )
    cny_end: Optional[str] = Field(
        default=None, description="CNY shutdown end date (YYYY-MM-DD)"
    )
    cny_strategy: str = Field(
        default="before", pattern="^(before|after)$",
        description="CNY avoidance strategy"
    )
```

**Example Request**:

```bash
curl -X POST http://forecasting-service:8000/calculate/order-trigger \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 101,
    "current_stock": 150,
    "daily_consumption_rate": 2.5,
    "reorder_point": 85,
    "shipment_mode": "sea",
    "mfg_days": 90,
    "shipment_days": 52,
    "customs_days": 10,
    "cny_strategy": "before"
  }'
```

**Example Response**:

```json
{
  "product_id": 101,
  "order_trigger_date": "2025-01-09",
  "order_immediately": true,
  "total_lead_time_days": 162,
  "timeline": {
    "order_trigger_date": "2025-01-09",
    "mfg_complete_date": "2025-04-09",
    "ship_date": "2025-04-11",
    "arrival_date": "2025-06-02",
    "customs_clearance_date": "2025-06-12",
    "available_for_sale_date": "2025-06-13",
    "milestones": [
      {
        "date": "2025-01-09",
        "event": "Place order with supplier",
        "action": "Send purchase order to Chinese supplier"
      },
      {
        "date": "2025-04-09",
        "event": "Manufacturing complete",
        "action": "Confirm production completion; arrange QC inspection"
      },
      {
        "date": "2025-04-11",
        "event": "Ship from supplier",
        "action": "Confirm shipment; receive BL/tracking number"
      },
      {
        "date": "2025-06-02",
        "event": "Arrive at BD port",
        "action": "Initiate customs clearance; submit import documents"
      },
      {
        "date": "2025-06-12",
        "event": "Customs cleared",
        "action": "Arrange inland transport to warehouse"
      },
      {
        "date": "2025-06-13",
        "event": "Available for sale",
        "action": "Update inventory system; list on sales channels"
      }
    ]
  },
  "step4_cny_analysis": {
    "cny_risk": true,
    "original_date": "2025-01-29",
    "adjusted_date": "2025-01-09",
    "strategy_used": "before",
    "explanation": "Order date 2025-01-29 falls in CNY shutdown (2025-01-20 to 2025-02-20). Adjusted to order BEFORE CNY: 2025-01-09."
  }
}
```

---

### 5.6 Backtest Model

```
POST /forecast/backtest
```

**Request Schema**:

```python
class BacktestRequest(BaseModel):
    tenant_id: int = Field(..., gt=0)
    product_ids: list[int] = Field(..., min_length=1, max_length=100)
    model_type: str = Field(
        default="all",
        pattern="^(prophet|regression|exp_smoothing|all)$"
    )
    train_pct: float = Field(
        default=0.80, ge=0.5, le=0.95,
        description="Training data percentage"
    )
```

**Example Response**:

```json
{
  "tenant_id": 1,
  "product_id": 101,
  "train_pct": 0.80,
  "results_by_model": {
    "prophet": {
      "mape": 8.5,
      "mae": 12.3,
      "mse": 245.6,
      "rmse": 15.67,
      "best_alpha": null
    },
    "regression": {
      "mape": 15.2,
      "mae": 22.1,
      "mse": 680.4,
      "rmse": 26.08,
      "best_alpha": null
    },
    "exp_smoothing": {
      "mape": 11.3,
      "mae": 16.8,
      "mse": 420.1,
      "rmse": 20.50,
      "best_alpha": 0.4
    }
  },
  "best_model": "prophet",
  "best_mape": 8.5,
  "total_data_points": 36,
  "rolling_windows_evaluated": 12
}
```

---

### 5.7 Seasonal Decomposition

```
POST /analysis/seasonal-decompose
```

**Request Schema**:

```python
class SeasonalDecomposeRequest(BaseModel):
    tenant_id: int = Field(..., gt=0)
    product_id: int = Field(..., gt=0)
    period: int = Field(
        default=12, ge=2, le=60,
        description="Seasonal period in months (12 = yearly seasonality)"
    )
    model: str = Field(
        default="multiplicative",
        pattern="^(additive|multiplicative)$",
        description="Decomposition model type"
    )
```

**Example Response**:

```json
{
  "tenant_id": 1,
  "product_id": 101,
  "period": 12,
  "model": "multiplicative",
  "trend": [95.2, 96.1, 97.3, 98.0, 98.5, 99.1, 100.2, 101.0, 102.3, 103.5, 104.1, 105.0],
  "seasonal": [1.18, 1.12, 1.02, 0.95, 0.88, 0.82, 0.78, 0.80, 0.85, 1.05, 1.20, 1.35],
  "residual": [0.98, 1.02, 0.97, 1.01, 0.99, 1.03, 0.96, 1.01, 0.98, 1.02, 0.99, 1.01],
  "components_chart_data": {
    "x_axis": ["2024-01", "2024-02", "2024-03", "2024-04", "2024-05", "2024-06", "2024-07", "2024-08", "2024-09", "2024-10", "2024-11", "2024-12"],
    "original": [112, 108, 99, 93, 87, 81, 78, 81, 87, 109, 125, 142],
    "trend_line": [95.2, 96.1, 97.3, 98.0, 98.5, 99.1, 100.2, 101.0, 102.3, 103.5, 104.1, 105.0],
    "seasonal_component": [1.18, 1.12, 1.02, 0.95, 0.88, 0.82, 0.78, 0.80, 0.85, 1.05, 1.20, 1.35],
    "residual_component": [0.98, 1.02, 0.97, 1.01, 0.99, 1.03, 0.96, 1.01, 0.98, 1.02, 0.99, 1.01]
  }
}
```

---

### 5.8 Authentication & Authorization

All API endpoints require service-to-service authentication:

```python
# app/api/middleware.py

from fastapi import Request, HTTPException
from app.config import settings


async def verify_service_token(request: Request):
    """
    Verify that the request comes from the Laravel backend
    using a shared service authentication token.
    """
    token = request.headers.get("X-Service-Token")
    if token != settings.SERVICE_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid service token")

    tenant_id = request.headers.get("X-Tenant-ID")
    if not tenant_id:
        raise HTTPException(status_code=400, detail="X-Tenant-ID header required")

    return int(tenant_id)
```

**Headers Required on All Requests**:

| Header | Description | Example |
|--------|-------------|---------|
| `X-Service-Token` | Shared authentication token between Laravel and Python | `Bearer abc123...` |
| `X-Tenant-ID` | Tenant identifier for multi-tenancy | `1` |
| `X-Request-ID` | Correlation ID for tracing | `uuid-4-string` |

---

## Section 6: Configuration Reference

### 6.1 Complete Configuration Table

| Parameter | Default | Valid Range | Scope | Description |
|-----------|---------|------------|-------|-------------|
| `default_alpha` | 0.3 | 0.05–0.95 | Tenant, SKU | Default exponential smoothing constant |
| `default_service_level` | 0.95 | 0.90–0.999 | Tenant, SKU | Target service level for safety stock |
| `default_holding_cost_pct` | 0.20 | 0.05–0.50 | Tenant | Holding cost as fraction of unit cost |
| `default_ordering_cost` | 500.0 | 100–5000 | Tenant | Fixed cost per purchase order (BDT) |
| `manufacturing_lead_time_days` | 90 | 30–180 | Tenant, Supplier | Manufacturing lead time in days |
| `sea_shipment_days` | 52 | 30–90 | Tenant | Sea shipment days (China → BD) |
| `air_shipment_days` | 8 | 3–20 | Tenant | Air shipment days (China → BD) |
| `customs_clearance_days_sea` | 10 | 3–30 | Tenant | Customs days for sea shipments |
| `customs_clearance_days_air` | 3 | 1–10 | Tenant | Customs days for air shipments |
| `review_period_days` | 10 | 1–30 | Tenant | Inventory review period in days |
| `mape_threshold` | 10.0 | 5–50 | Tenant | MAPE % threshold for auto-recalibration |
| `rmse_mae_ratio_threshold` | 1.15 | 1.0–2.0 | Tenant | RMSE/MAE ratio threshold for outlier alert |
| `outlier_sigma_threshold` | 3.0 | 2.0–5.0 | Tenant, SKU | Sigma threshold for outlier removal |
| `regression_window_months` | 36 | 12–60 | Tenant, SKU | Historical data window for regression |
| `min_data_points` | 12 | 6–24 | Tenant | Minimum data points to fit a model |
| `prophet_changepoint_prior_scale` | 0.05 | 0.001–0.5 | Tenant, SKU | Prophet trend flexibility |
| `prophet_seasonality_prior_scale` | 10.0 | 1–25 | Tenant, SKU | Prophet seasonal model strength |
| `prophet_holidays_prior_scale` | 10.0 | 1–25 | Tenant | Prophet holiday effect strength |
| `prophet_mcmc_samples` | 0 | 0, 100, 1000 | Tenant | MCMC samples for uncertainty (0=fast) |
| `exp_smoothing_auto_tune` | true | true/false | Tenant | Auto-tune alpha via backtest |
| `exp_smoothing_auto_tune_step` | 0.1 | 0.01–0.2 | Tenant | Step size for alpha grid search |
| `backtest_train_pct` | 0.80 | 0.50–0.95 | Tenant | Training data % for backtest |
| `backtest_rolling_window_months` | 12 | 3–24 | Tenant | Rolling origin window size |
| `cny_buffer_days` | 10 | 5–20 | Tenant | Buffer days around CNY shutdown |
| `recalibration_cadence` | "weekly" | daily/weekly/monthly | Tenant | How often recalibration runs |
| `max_products_per_batch` | 500 | 10–5000 | Tenant | Maximum products per forecast batch |
| `forecast_horizon_max_months` | 24 | 6–36 | Tenant | Maximum forecast horizon |
| `normalize_mae_to_daily` | true | true/false | Tenant | Normalize MAE to daily rate for safety stock |

### 6.2 Configuration Hierarchy

Configuration values are resolved in the following priority order (highest wins):

```
1. SKU-level override     (tenant_sku_config table)
2. Category-level override (tenant_category_config table)
3. Tenant-level default   (tenant_config table)
4. System-wide default    (hardcoded in Python service)
```

### 6.3 Configuration API

```
GET  /config/{tenant_id}                    → Get tenant config
PUT  /config/{tenant_id}                    → Update tenant config
GET  /config/{tenant_id}/sku/{sku_id}       → Get SKU-level config override
PUT  /config/{tenant_id}/sku/{sku_id}       → Set SKU-level config override
```

---

## Section 7: Performance Requirements

### 7.1 Latency Targets

| Operation | Target | Maximum | Notes |
|-----------|--------|---------|-------|
| Forecast generation (per product) | < 10s | 30s | Prophet is the bottleneck; regression + ES add < 5s |
| Full tenant forecast (all SKUs) | < 3 min | 5 min | Parallelized across worker processes |
| Order trigger calculation | < 0.5s | 1s | Pure arithmetic; no ML model involved |
| EOQ calculation | < 0.1s | 0.5s | Simple formula |
| Safety stock calculation | < 0.1s | 0.5s | Simple formula |
| Backtest (per product) | < 1 min | 2 min | Rolling origin adds overhead |
| Seasonal decomposition | < 2s | 5s | statsmodels STL decomposition |
| Prophet model fit (per SKU) | < 5s | 10s | Depends on data length and Fourier order |
| Regression fit (per SKU) | < 2s | 5s | OLS is fast |
| Health check | < 50ms | 100ms | Simple connectivity check |

### 7.2 Throughput Targets

| Metric | Target | Maximum |
|--------|--------|---------|
| Concurrent forecast jobs per worker | 25 | 100 |
| Forecast jobs per hour (per worker) | 500 | 2000 |
| API requests per second | 100 | 500 |
| Queue processing rate | 50 jobs/min | 200 jobs/min |

### 7.3 Scalability Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                  HORIZONTAL SCALING ARCHITECTURE                 │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                   │
│  │ Worker 1 │    │ Worker 2 │    │ Worker 3 │  ← Scale out     │
│  │ (CPU: 2) │    │ (CPU: 2) │    │ (CPU: 2) │    by adding     │
│  │ (RAM:4G) │    │ (RAM:4G) │    │ (RAM:4G) │    containers   │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘                   │
│       │               │               │                          │
│       └───────────────┴───────────────┘                          │
│                       │                                          │
│                  ┌────┴────┐                                     │
│                  │  Redis  │  ← Shared job queue                 │
│                  │  Queue  │                                     │
│                  └─────────┘                                     │
│                       │                                          │
│                  ┌────┴────┐                                     │
│                  │PostgreSQL│  ← Shared results store            │
│                  └─────────┘                                     │
│                                                                  │
│  Workers are stateless → any worker can pick up any job          │
│  Adding N workers ≈ N× throughput increase                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Section 8: Deployment & Infrastructure

### 8.1 Docker Configuration

```dockerfile
# Dockerfile

FROM python:3.12-slim AS base

# System dependencies for Prophet (requires C compiler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Production: Uvicorn with multiple workers
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 8.2 Docker Compose

```yaml
# docker-compose.yml

version: "3.8"

services:
  forecasting-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - APP_VERSION=1.0.0
      - DATABASE_URL=postgresql+asyncpg://trimedcast:${DB_PASS}@postgres:5432/trimedcast
      - REDIS_URL=redis://redis:6379/0
      - SERVICE_AUTH_TOKEN=${FORECAST_SERVICE_TOKEN}
      - LARAVEL_CALLBACK_URL=http://laravel:80
      - WORKER_PROCESSES=4
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2.0"
          memory: 4G
        reservations:
          cpus: "1.0"
          memory: 2G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  forecasting-worker:
    build: .
    command: ["python", "-m", "app.workers.forecast_worker"]
    environment:
      - DATABASE_URL=postgresql+asyncpg://trimedcast:${DB_PASS}@postgres:5432/trimedcast
      - REDIS_URL=redis://redis:6379/0
      - SERVICE_AUTH_TOKEN=${FORECAST_SERVICE_TOKEN}
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: "2.0"
          memory: 4G

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=trimedcast
      - POSTGRES_USER=trimedcast
      - POSTGRES_PASSWORD=${DB_PASS}
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

### 8.3 Resource Sizing

| Component | CPU | RAM | Disk | Instances |
|-----------|-----|-----|------|-----------|
| FastAPI server | 2 cores | 4 GB | 10 GB | 2 (minimum) |
| Forecast worker | 2 cores | 4 GB | 10 GB | 4 (minimum) |
| PostgreSQL | 4 cores | 16 GB | 100 GB SSD | 1 (primary) + 1 (replica) |
| Redis | 1 core | 2 GB | 10 GB | 1 |

---

## Section 9: Monitoring & Observability

### 9.1 Logging

All logs use structured JSON format via `structlog`:

```json
{
  "timestamp": "2025-03-04T10:30:05.123Z",
  "level": "info",
  "service": "forecasting-service",
  "tenant_id": 1,
  "job_id": "550e8400-...",
  "event": "forecast_completed",
  "product_id": 101,
  "method": "prophet",
  "mape": 7.2,
  "duration_seconds": 4.5
}
```

### 9.2 Metrics (Prometheus)

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `forecast_jobs_total` | Counter | tenant_id, status | Total forecast jobs processed |
| `forecast_duration_seconds` | Histogram | tenant_id, method | Forecast computation time |
| `forecast_mape` | Gauge | tenant_id, product_id | Current MAPE per product |
| `eoq_calculations_total` | Counter | tenant_id | EOQ calculation count |
| `order_trigger_calculations_total` | Counter | tenant_id, cny_risk | Order trigger calculations |
| `backtest_runs_total` | Counter | tenant_id | Backtest execution count |
| `queue_depth` | Gauge | queue_name | Current Redis queue depth |
| `worker_active_jobs` | Gauge | worker_id | Jobs currently being processed |

### 9.3 Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| HighMAPE | avg MAPE > 15% for 1 hour | Warning | Slack notification to data team |
| ForecastStalled | No forecast completed in 30 min | Critical | Page on-call; check worker health |
| QueueBacklog | queue_depth > 200 | Warning | Scale up worker replicas |
| WorkerOOM | Worker process killed (OOM) | Critical | Increase memory limit; investigate |
| DBConnectionPoolExhausted | Pool usage > 90% | Warning | Increase pool size |

---

## Section 10: Security Considerations

### 10.1 Multi-Tenant Isolation

- **Tenant ID injection**: Every database query includes `WHERE tenant_id = ?` — enforced at the SQLAlchemy repository layer
- **Redis queue namespacing**: Jobs are keyed by `forecast:jobs:{tenant_id}`
- **No cross-tenant data access**: The Python service never performs cross-tenant queries; tenant_id is validated on every request

### 10.2 Service Authentication

- Laravel ↔ Python communication uses a shared `X-Service-Token` header
- Token is stored in environment variables (never in code)
- Rotate tokens on a 90-day cadence
- IP whitelist: Python service only accepts connections from Laravel's IP range

### 10.3 Data Protection

- No PII (personally identifiable information) is processed by the forecasting service
- All data is business/financial: product IDs, quantities, prices, costs
- Database connections use SSL/TLS
- Redis connections use password authentication

### 10.4 Input Validation

- All API inputs are validated via Pydantic models with strict type checking
- `product_ids` arrays are capped at 500 to prevent DoS
- `forecast_horizon_months` is capped at 24
- All numeric inputs have `gt=0` (greater than zero) constraints where appropriate

---

## Appendix A: BD Season Calendar

### A.1 Bangladesh Season System (Bengali Calendar)

Bangladesh follows the Bengali calendar (বঙ্গাব্দ) with **6 seasons** (ঋতু), each approximately 2 months:

| Bengali Season | Gregorian Months | Weather | Motorcycle Parts Impact |
|---------------|-----------------|---------|------------------------|
| **গ্রীষ্ম** (Grismo/Summer) | Mid-Apr – Mid-Jun | Hot (35-40°C), humid | Normal demand; AC/engine cooling parts up |
| **বর্ষা** (Barsha/Monsoon) | Mid-Jun – Mid-Aug | Heavy rain, flooding | Street parts DOWN; off-road/mud parts UP |
| **শরৎ** (Sharat/Autumn) | Mid-Aug – Mid-Oct | Post-monsoon, clearing | Demand normalizing; pre-winter planning starts |
| **হেমন্ত** (Hemanta/Late Autumn) | Mid-Oct – Mid-Dec | Cooling, dry | Pre-winter spike; dealers stock cold-weather parts |
| **শীত** (Shit/Winter) | Mid-Dec – Mid-Feb | Cool (10-15°C in north), fog | Peak demand for cold-weather parts |
| **বসন্ত** (Boshonto/Spring) | Mid-Feb – Mid-Apr | Warm, pleasant | Demand declining from winter peak |

### A.2 Key Dates for 2025

| Date | Event | Effect on Parts Demand |
|------|-------|----------------------|
| 2025-01-20 – 2025-02-20 | **CNY Supply Shutdown** | No orders to China; existing orders delayed |
| 2025-02-14 | **International Mother Language Day** | Minimal impact |
| 2025-03-26 | **Independence Day** | Slight dip (national holiday) |
| 2025-03-30 – 2025-04-05 | **Eid-ul-Fitr** | Significant dip (shops closed, ~30% reduction) |
| 2025-04-14 | **Pohela Boishakh** (Bengali New Year) | Slight boost (~8% increase — new year purchases) |
| 2025-06-06 – 2025-06-12 | **Eid-ul-Adha** | Significant dip (~25% reduction) |
| 2025-10-01 – 2025-10-05 | **Durga Puja** | Mixed (+10% for some segments) |
| 2025-11 – 2026-02 | **Winter Season** | Peak demand for cold-weather parts |
| 2025-06 – 2025-09 | **Monsoon Season** | Shift: street parts ↓, off-road parts ↑ |

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **BD** | Bangladesh |
| **BDT** | Bangladeshi Taka (currency) |
| **CNY** | Chinese New Year — annual ~30-day factory shutdown in China |
| **Consensus Forecast** | The "Single Set of Numbers" combining all models and overrides |
| **EOQ** | Economic Order Quantity — optimal order size minimizing total inventory cost |
| **MAE** | Mean Absolute Error — average forecast error in units |
| **MAPE** | Mean Absolute Percentage Error — forecast error as % of actual |
| **MSE** | Mean Squared Error — penalizes large outliers |
| **RMSE** | Root Mean Squared Error — standard deviation of forecast residuals |
| **MOQ** | Minimum Order Quantity — supplier's minimum order size |
| **Prophet** | Facebook's open-source time-series forecasting library |
| **ROP** | Reorder Point — inventory level at which a new order should be placed |
| **S&OE** | Sales & Operations Execution — weekly tactical planning rhythm |
| **S&OP** | Sales & Operations Planning — monthly strategic planning rhythm |
| **SKU** | Stock Keeping Unit — unique product identifier |
| **SS** | Safety Stock — buffer inventory for demand/lead time uncertainty |
| **σ_LT** | Standard deviation of lead time — measures lead time variability |
| **μₜ** | Mean lead time — average time from order to delivery |
| **OLS** | Ordinary Least Squares — regression estimation method |
| **α (alpha)** | Exponential smoothing constant — weights recent vs historical data |
| **β₀, β₁, β₂** | Regression coefficients — intercept, price elasticity, promo impact |
| **k** | Safety factor — z-score for desired service level |

---

## Appendix C: Error Codes

| Code | HTTP Status | Description | Resolution |
|------|-------------|-------------|------------|
| `FE_001` | 400 | Insufficient historical data | Provide at least 12 months of sales data |
| `FE_002` | 400 | Invalid forecast horizon | Use a value between 1-24 months |
| `FE_003` | 400 | Invalid shipment mode | Use "sea" or "air" |
| `FE_004` | 400 | Daily consumption rate must be positive | Check demand data for the SKU |
| `FE_005` | 422 | Prophet model failed to converge | Try increasing changepoint_prior_scale or reducing data length |
| `FE_006` | 422 | Regression model insignificant (F-test failed) | Product may not have price/promo sensitivity; use Prophet only |
| `FE_007` | 404 | Product not found | Verify product_id exists in the tenant's catalog |
| `FE_008` | 404 | Job not found | Verify job_id; job may have expired from status cache |
| `FE_009` | 401 | Invalid service token | Verify X-Service-Token header matches configured value |
| `FE_010` | 400 | Tenant ID mismatch | Token tenant_id does not match request tenant_id |
| `FE_011` | 500 | Database connection error | Check PostgreSQL connectivity and connection pool |
| `FE_012` | 500 | Redis connection error | Check Redis connectivity |
| `FE_013` | 422 | Outlier removal left insufficient data | Lower outlier_sigma_threshold or provide more historical data |
| `FE_014` | 409 | Forecast job already running for this SKU | Wait for existing job to complete or cancel it |
| `FE_015` | 429 | Rate limit exceeded | Reduce request frequency; default: 100 req/min per tenant |

---

*End of Document — TrimedCast Forecasting Engine Specification v1.0.0*
