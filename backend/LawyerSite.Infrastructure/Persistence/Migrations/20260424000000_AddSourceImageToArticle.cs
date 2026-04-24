using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LawyerSite.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSourceImageToArticle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceImage",
                table: "Articles",
                type: "TEXT",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourceImage",
                table: "Articles");
        }
    }
}
