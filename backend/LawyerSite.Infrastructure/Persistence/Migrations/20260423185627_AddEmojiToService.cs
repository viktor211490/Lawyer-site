using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LawyerSite.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddEmojiToService : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Emoji",
                table: "Services",
                type: "TEXT",
                maxLength: 10,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Emoji",
                table: "Services");
        }
    }
}
