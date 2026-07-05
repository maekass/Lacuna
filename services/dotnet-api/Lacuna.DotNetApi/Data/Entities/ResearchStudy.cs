using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Lacuna.DotNetApi.Data.Entities;

[Table("research_studies")]
public sealed class ResearchStudy
{
    [Key]
    [Column("study_id")]
    public string StudyId { get; set; } = string.Empty;

    [Column("institution")]
    public string Institution { get; set; } = string.Empty;

    [Column("sample_size")]
    public int SampleSize { get; set; }

    [Column("source")]
    public string Source { get; set; } = string.Empty;

    [Column("marker_genes", TypeName = "jsonb")]
    public List<string> MarkerGenes { get; set; } = [];
}
