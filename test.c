#include <stdio.h>

int main() {
    int A[7] = {28, 45, 89, 34, 123, 6, 52};
    int B[7];

    int i = 0;
    int Number = 7;

    while (i < Number) {
        int count = 0;

        count = count + A[i];

        if (i > 0) {
            count = count + A[i - 1];
        }

        if (i < Number - 1) {
            count = count + A[i + 1];
        }

        B[i] = count / 3;

        i = i + 1;
    }

    i = 0;
    while (i < Number) {
        printf("%d ", B[i]);
        i = i + 1;
    }

    return 0;
}