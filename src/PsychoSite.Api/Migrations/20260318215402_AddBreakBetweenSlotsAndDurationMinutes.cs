using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PsychoSite.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBreakBetweenSlotsAndDurationMinutes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BreakBetweenSlotsMinutes",
                table: "WorkingHours",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "BlockedSlots",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BreakBetweenSlotsMinutes",
                table: "WorkingHours");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "BlockedSlots");
        }
    }
}
