"""
Export utilities for dashboard data
Excel, CSV, and PDF export functionality
"""

import pandas as pd
import io
from typing import Optional, List, Dict
from datetime import datetime
import base64


def export_to_excel(
    dataframes: Dict[str, pd.DataFrame],
    filename: Optional[str] = None
) -> bytes:
    """
    Export multiple DataFrames to Excel with separate sheets.
    
    Args:
        dataframes: Dictionary of {sheet_name: dataframe}
        filename: Optional filename (without extension)
        
    Returns:
        Excel file as bytes
    """
    if filename is None:
        filename = f"dashboard_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        for sheet_name, df in dataframes.items():
            # Clean sheet name (Excel has restrictions)
            clean_name = sheet_name[:31].replace('/', '_').replace('\\', '_')
            df.to_excel(writer, sheet_name=clean_name, index=False)
    
    output.seek(0)
    return output.getvalue()


def export_to_csv(df: pd.DataFrame) -> bytes:
    """
    Export DataFrame to CSV.
    
    Args:
        df: DataFrame to export
        
    Returns:
        CSV file as bytes
    """
    return df.to_csv(index=False).encode('utf-8')


def create_download_link(
    data: bytes,
    filename: str,
    link_text: str = "Download"
) -> str:
    """
    Create a download link for data.
    
    Args:
        data: Data as bytes
        filename: Filename for download
        link_text: Text for the link
        
    Returns:
        HTML download link
    """
    b64 = base64.b64encode(data).decode()
    
    # Determine MIME type
    if filename.endswith('.xlsx'):
        mime_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    elif filename.endswith('.csv'):
        mime_type = 'text/csv'
    elif filename.endswith('.pdf'):
        mime_type = 'application/pdf'
    else:
        mime_type = 'application/octet-stream'
    
    href = f'<a href="data:{mime_type};base64,{b64}" download="{filename}">{link_text}</a>'
    return href


def export_summary_report(
    title: str,
    summary_stats: Dict[str, any],
    dataframes: Dict[str, pd.DataFrame]
) -> bytes:
    """
    Create a comprehensive Excel report with summary and data.
    
    Args:
        title: Report title
        summary_stats: Dictionary of summary statistics
        dataframes: Dictionary of DataFrames to include
        
    Returns:
        Excel file as bytes
    """
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        # Summary sheet
        summary_data = []
        summary_data.append(['Report Title', title])
        summary_data.append(['Generated', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        summary_data.append(['', ''])
        summary_data.append(['Summary Statistics', ''])
        
        for key, value in summary_stats.items():
            summary_data.append([key, value])
        
        summary_df = pd.DataFrame(summary_data, columns=['Metric', 'Value'])
        summary_df.to_excel(writer, sheet_name='Summary', index=False)
        
        # Data sheets
        for sheet_name, df in dataframes.items():
            clean_name = sheet_name[:31].replace('/', '_').replace('\\', '_')
            df.to_excel(writer, sheet_name=clean_name, index=False)
    
    output.seek(0)
    return output.getvalue()


def format_dataframe_for_export(
    df: pd.DataFrame,
    columns_to_include: Optional[List[str]] = None,
    rename_columns: Optional[Dict[str, str]] = None
) -> pd.DataFrame:
    """
    Format DataFrame for export (clean column names, select columns, etc.).
    
    Args:
        df: Input DataFrame
        columns_to_include: List of columns to include (None = all)
        rename_columns: Dictionary of {old_name: new_name}
        
    Returns:
        Formatted DataFrame
    """
    export_df = df.copy()
    
    # Select columns
    if columns_to_include:
        export_df = export_df[[col for col in columns_to_include if col in export_df.columns]]
    
    # Rename columns
    if rename_columns:
        export_df = export_df.rename(columns=rename_columns)
    
    # Clean up data types
    for col in export_df.columns:
        if export_df[col].dtype == 'object':
            # Convert to string and strip whitespace
            export_df[col] = export_df[col].astype(str).str.strip()
        elif pd.api.types.is_datetime64_any_dtype(export_df[col]):
            # Format dates
            export_df[col] = export_df[col].dt.strftime('%Y-%m-%d')
    
    return export_df


def create_export_buttons(
    df: pd.DataFrame,
    filename_prefix: str,
    include_excel: bool = True,
    include_csv: bool = True,
    additional_sheets: Optional[Dict[str, pd.DataFrame]] = None
):
    """
    Create export buttons in Streamlit.
    
    Args:
        df: Main DataFrame to export
        filename_prefix: Prefix for filenames
        include_excel: Include Excel export button
        include_csv: Include CSV export button
        additional_sheets: Additional sheets for Excel export
    """
    import streamlit as st
    
    st.markdown("### 📥 Export Data")
    
    col1, col2 = st.columns(2)
    
    # CSV Export
    if include_csv:
        with col1:
            csv_data = export_to_csv(df)
            st.download_button(
                label="📄 Download CSV",
                data=csv_data,
                file_name=f"{filename_prefix}_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv",
                help="Download data as CSV file"
            )
    
    # Excel Export
    if include_excel:
        with col2:
            sheets = {'Data': df}
            if additional_sheets:
                sheets.update(additional_sheets)
            
            excel_data = export_to_excel(sheets)
            st.download_button(
                label="📊 Download Excel",
                data=excel_data,
                file_name=f"{filename_prefix}_{datetime.now().strftime('%Y%m%d')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                help="Download data as Excel file with multiple sheets"
            )


def export_chart_data(
    chart_data: pd.DataFrame,
    chart_title: str
) -> bytes:
    """
    Export chart data with metadata.
    
    Args:
        chart_data: DataFrame with chart data
        chart_title: Title of the chart
        
    Returns:
        Excel file as bytes
    """
    sheets = {
        'Chart Data': chart_data,
        'Metadata': pd.DataFrame({
            'Property': ['Chart Title', 'Generated', 'Data Points'],
            'Value': [chart_title, datetime.now().strftime('%Y-%m-%d %H:%M:%S'), len(chart_data)]
        })
    }
    
    return export_to_excel(sheets)
