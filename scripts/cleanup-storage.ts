import { runStorageCleanup } from "../src/lib/storage-cleanup";

async function main() {
  const result = await runStorageCleanup();
  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
