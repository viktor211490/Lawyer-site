namespace LawyerSite.Api.Domain;

public enum ArticleStatus
{
    Draft = 0,       // Черновик
    Published = 1,   // Опубликовано
    Hidden = 2,      // Скрыто (только по ссылке)
    Scheduled = 3    // Запланировано
}
