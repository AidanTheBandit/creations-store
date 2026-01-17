import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  bio: string | null;
  avatar: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  bookmarkCount: number;
}

interface UserManagerProps {
  users: User[];
}

export function UserManager({ users }: UserManagerProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Bookmarks</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground">
              No users yet
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.bookmarkCount}</Badge>
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Link
                  href={`/u/${user.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View Profile
                </Link>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
