#include "HolyQuickPanel.h"

typedef struct {
    unsigned long   index;
    char            str[256];
} TableString;

TableString g_strs[StrID_NUMTYPES] = {
    { StrID_NONE,        "" },
    { StrID_Name,        "Holy Quick Panel" },
    { StrID_Description, "Holy Expressor quick-access snippet popup." },
    { StrID_GenericError, "Error in Holy Quick Panel." }
};

A_char* GetStringPtr(int strNum)
{
    return g_strs[strNum].str;
}
