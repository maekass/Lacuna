"""
Advanced filtering components for Streamlit dashboard
Multi-select, date ranges, and complex filters
"""

import streamlit as st
import pandas as pd
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta


def multi_select_filter(
    label: str,
    options: List[str],
    default: Optional[List[str]] = None,
    key: Optional[str] = None,
    help_text: Optional[str] = None
) -> List[str]:
    """
    Create a multi-select filter with "Select All" option.
    
    Args:
        label: Filter label
        options: List of options
        default: Default selected options
        key: Unique key for widget
        help_text: Help text
        
    Returns:
        List of selected options
    """
    if not options:
        return []
    
    col1, col2 = st.columns([3, 1])
    
    with col1:
        selected = st.multiselect(
            label,
            options=options,
            default=default or [],
            key=key,
            help=help_text
        )
    
    with col2:
        st.write("")  # Spacing
        if st.button("Select All", key=f"{key}_all" if key else None):
            selected = options
    
    return selected


def date_range_filter(
    label: str = "Date Range",
    default_days_back: int = 365,
    key: Optional[str] = None
) -> Tuple[datetime, datetime]:
    """
    Create a date range filter.
    
    Args:
        label: Filter label
        default_days_back: Default number of days to look back
        key: Unique key for widget
        
    Returns:
        Tuple of (start_date, end_date)
    """
    col1, col2 = st.columns(2)
    
    default_start = datetime.now() - timedelta(days=default_days_back)
    default_end = datetime.now()
    
    with col1:
        start_date = st.date_input(
            "Start Date",
            value=default_start,
            key=f"{key}_start" if key else None
        )
    
    with col2:
        end_date = st.date_input(
            "End Date",
            value=default_end,
            key=f"{key}_end" if key else None
        )
    
    return datetime.combine(start_date, datetime.min.time()), datetime.combine(end_date, datetime.max.time())


def phase_filter(
    default: Optional[List[str]] = None,
    key: Optional[str] = None
) -> List[str]:
    """
    Create a phase filter for clinical trials.
    
    Args:
        default: Default selected phases
        key: Unique key for widget
        
    Returns:
        List of selected phases
    """
    phases = [
        'EARLY_PHASE1',
        'PHASE1',
        'PHASE1_PHASE2',
        'PHASE2',
        'PHASE2_PHASE3',
        'PHASE3',
        'PHASE4',
        'NA'
    ]
    
    return multi_select_filter(
        "Trial Phase",
        options=phases,
        default=default,
        key=key,
        help_text="Select one or more trial phases to filter"
    )


def status_filter(
    default: Optional[List[str]] = None,
    key: Optional[str] = None
) -> List[str]:
    """
    Create a status filter for clinical trials.
    
    Args:
        default: Default selected statuses
        key: Unique key for widget
        
    Returns:
        List of selected statuses
    """
    statuses = [
        'RECRUITING',
        'ACTIVE_NOT_RECRUITING',
        'COMPLETED',
        'TERMINATED',
        'SUSPENDED',
        'WITHDRAWN',
        'NOT_YET_RECRUITING',
        'ENROLLING_BY_INVITATION'
    ]
    
    return multi_select_filter(
        "Trial Status",
        options=statuses,
        default=default,
        key=key,
        help_text="Select one or more trial statuses to filter"
    )


def sponsor_type_filter(
    default: Optional[List[str]] = None,
    key: Optional[str] = None
) -> List[str]:
    """
    Create a sponsor type filter.
    
    Args:
        default: Default selected sponsor types
        key: Unique key for widget
        
    Returns:
        List of selected sponsor types
    """
    sponsor_types = [
        'INDUSTRY',
        'ACADEMIC',
        'NIH',
        'OTHER',
        'UNKNOWN'
    ]
    
    return multi_select_filter(
        "Sponsor Type",
        options=sponsor_types,
        default=default,
        key=key,
        help_text="Select one or more sponsor types to filter"
    )


def numeric_range_filter(
    label: str,
    min_value: float,
    max_value: float,
    default_range: Optional[Tuple[float, float]] = None,
    step: float = 1.0,
    key: Optional[str] = None
) -> Tuple[float, float]:
    """
    Create a numeric range slider filter.
    
    Args:
        label: Filter label
        min_value: Minimum value
        max_value: Maximum value
        default_range: Default range
        step: Step size
        key: Unique key for widget
        
    Returns:
        Tuple of (min_selected, max_selected)
    """
    if default_range is None:
        default_range = (min_value, max_value)
    
    selected_range = st.slider(
        label,
        min_value=min_value,
        max_value=max_value,
        value=default_range,
        step=step,
        key=key
    )
    
    return selected_range


def apply_filters_to_dataframe(
    df: pd.DataFrame,
    filters: Dict[str, any]
) -> pd.DataFrame:
    """
    Apply multiple filters to a DataFrame.
    
    Args:
        df: Input DataFrame
        filters: Dictionary of filters to apply
            - 'phases': List of phases
            - 'statuses': List of statuses
            - 'sponsor_types': List of sponsor types
            - 'date_range': Tuple of (start_date, end_date)
            - 'enrollment_range': Tuple of (min, max)
            
    Returns:
        Filtered DataFrame
    """
    filtered_df = df.copy()
    
    # Phase filter
    if 'phases' in filters and filters['phases']:
        filtered_df = filtered_df[filtered_df['phase'].isin(filters['phases'])]
    
    # Status filter
    if 'statuses' in filters and filters['statuses']:
        filtered_df = filtered_df[filtered_df['status'].isin(filters['statuses'])]
    
    # Sponsor type filter
    if 'sponsor_types' in filters and filters['sponsor_types']:
        filtered_df = filtered_df[filtered_df['sponsor_type'].isin(filters['sponsor_types'])]
    
    # Date range filter
    if 'date_range' in filters and filters['date_range']:
        start_date, end_date = filters['date_range']
        if 'start_date' in filtered_df.columns:
            filtered_df['start_date'] = pd.to_datetime(filtered_df['start_date'], errors='coerce')
            filtered_df = filtered_df[
                (filtered_df['start_date'] >= start_date) &
                (filtered_df['start_date'] <= end_date)
            ]
    
    # Enrollment range filter
    if 'enrollment_range' in filters and filters['enrollment_range']:
        min_enroll, max_enroll = filters['enrollment_range']
        if 'enrollment' in filtered_df.columns:
            filtered_df = filtered_df[
                (filtered_df['enrollment'] >= min_enroll) &
                (filtered_df['enrollment'] <= max_enroll)
            ]
    
    return filtered_df


def create_filter_summary(filters: Dict[str, any]) -> str:
    """
    Create a human-readable summary of applied filters.
    
    Args:
        filters: Dictionary of filters
        
    Returns:
        Summary string
    """
    summary_parts = []
    
    if filters.get('phases'):
        summary_parts.append(f"Phases: {', '.join(filters['phases'])}")
    
    if filters.get('statuses'):
        summary_parts.append(f"Statuses: {', '.join(filters['statuses'])}")
    
    if filters.get('sponsor_types'):
        summary_parts.append(f"Sponsors: {', '.join(filters['sponsor_types'])}")
    
    if filters.get('date_range'):
        start, end = filters['date_range']
        summary_parts.append(f"Dates: {start.strftime('%Y-%m-%d')} to {end.strftime('%Y-%m-%d')}")
    
    if filters.get('enrollment_range'):
        min_e, max_e = filters['enrollment_range']
        summary_parts.append(f"Enrollment: {min_e:.0f} to {max_e:.0f}")
    
    if not summary_parts:
        return "No filters applied"
    
    return " | ".join(summary_parts)


def filter_sidebar(df: pd.DataFrame, key_prefix: str = "filter") -> Tuple[pd.DataFrame, Dict[str, any]]:
    """
    Create a comprehensive filter sidebar.
    
    Args:
        df: DataFrame to filter
        key_prefix: Prefix for widget keys
        
    Returns:
        Tuple of (filtered_df, filters_dict)
    """
    st.sidebar.markdown("---")
    st.sidebar.subheader("🔍 Filters")
    
    filters = {}
    
    # Phase filter
    if 'phase' in df.columns:
        phases = phase_filter(key=f"{key_prefix}_phase")
        if phases:
            filters['phases'] = phases
    
    # Status filter
    if 'status' in df.columns:
        statuses = status_filter(key=f"{key_prefix}_status")
        if statuses:
            filters['statuses'] = statuses
    
    # Sponsor type filter
    if 'sponsor_type' in df.columns:
        sponsor_types = sponsor_type_filter(key=f"{key_prefix}_sponsor")
        if sponsor_types:
            filters['sponsor_types'] = sponsor_types
    
    # Date range filter
    if 'start_date' in df.columns:
        with st.sidebar.expander("📅 Date Range", expanded=False):
            date_range = date_range_filter(key=f"{key_prefix}_date")
            filters['date_range'] = date_range
    
    # Enrollment range filter
    if 'enrollment' in df.columns:
        enrollment_values = df['enrollment'].dropna()
        if len(enrollment_values) > 0:
            with st.sidebar.expander("👥 Enrollment Range", expanded=False):
                enrollment_range = numeric_range_filter(
                    "Enrollment Count",
                    min_value=float(enrollment_values.min()),
                    max_value=float(enrollment_values.max()),
                    key=f"{key_prefix}_enrollment"
                )
                filters['enrollment_range'] = enrollment_range
    
    # Apply filters
    filtered_df = apply_filters_to_dataframe(df, filters)
    
    # Show filter summary
    st.sidebar.caption(f"**Showing {len(filtered_df)} of {len(df)} trials**")
    
    # Reset button
    if st.sidebar.button("🔄 Reset Filters", key=f"{key_prefix}_reset"):
        st.rerun()
    
    return filtered_df, filters
